// Thin wrapper around the /api/chat proxy (Azure Static Web Apps Function),
// which in turn forwards to the Azure OpenAI v1 GA chat-completions endpoint.
//
// The browser NEVER sees the Azure key. The Function reads it from
// Application Settings and holds the connection to Azure server-side.
// See ../../SECURITY.md and ../../api/chat/index.js.
//
// Path: POST /api/chat
// Body: same shape the Azure endpoint accepts (model, messages, temperature, max_tokens)

import { logger } from '../util/logger.js';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

export class AzureOpenAIClient {
  constructor({ deployment } = {}) {
    // Deployment name is still useful so the client can pass it as `model`
    // in the body — the proxy falls back to its server-side default if absent.
    this.deployment = deployment || '';
  }

  // Always true: we assume the proxy is up. If it isn't, the first call will
  // surface a 5xx through the existing error paths.
  isReady() { return true; }
  whatIsMissing() { return null; }

  _url() { return `${API_BASE}/chat`; }

  async chat(messages, opts = {}) {
    const { data, message, reqId, tag, elapsed } = await this._post(messages, opts);

    let text =
      (typeof message?.content === 'string' && message.content.trim()) ||
      (Array.isArray(message?.content) &&
        message.content
          .filter((p) => p?.type === 'text' && p?.text)
          .map((p) => p.text)
          .join(' ')
          .trim()) ||
      '';

    if (!text) {
      const finishReason = data?.choices?.[0]?.finish_reason;
      logger.error('api', `[${reqId}]${tag} empty completion after ${elapsed}ms`, {
        finishReason,
        completionTokens: data?.usage?.completion_tokens,
        modelUsed: data?.model,
      });
      if (finishReason === 'length') {
        throw new Error('Hit token limit before producing an answer. Bump max_tokens.');
      }
      if (finishReason === 'content_filter') {
        throw new Error('Content filter blocked the response. Try rephrasing.');
      }
      throw new Error('Chat proxy returned no completion content.');
    }

    logger.info('api', `[${reqId}]${tag} ← ${elapsed}ms`, {
      textPreview: text.slice(0, 160),
      usage: data?.usage,
      modelUsed: data?.model,
    });

    return text.trim();
  }

  async _post(messages, opts) {
    const body = {
      model: this.deployment || undefined,
      messages,
      temperature: opts.temperature ?? 0.9,
      max_tokens: opts.maxTokens ?? 700,
    };

    const reqId = Math.random().toString(36).slice(2, 8);
    const tag = opts.tag ? ` [${opts.tag}]` : '';
    const t0 = performance.now();
    const url = this._url();

    logger.info('api', `[${reqId}]${tag} → POST`, {
      messageCount: messages.length,
      temperature: body.temperature,
      maxTokens: body.max_tokens,
      lastMessagePreview: (messages[messages.length - 1]?.content || '').slice(0, 140) + '…',
    });

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (networkErr) {
      logger.error('api', `[${reqId}]${tag} network error after ${Math.round(performance.now() - t0)}ms`, networkErr);
      throw networkErr;
    }

    const elapsed = Math.round(performance.now() - t0);

    if (!response.ok) {
      let detail = '';
      let parsed = null;
      try { parsed = await response.json(); detail = parsed?.error?.message || JSON.stringify(parsed); }
      catch { detail = await response.text(); }
      logger.error('api', `[${reqId}]${tag} HTTP ${response.status} after ${elapsed}ms`, { status: response.status, detail });
      const err = new Error(`Chat proxy ${response.status}: ${detail}`);
      err.status = response.status;
      err.detail = detail;
      err.fatal = response.status === 401 || response.status === 403 || response.status === 429;
      throw err;
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const message = choice?.message;
    return { data, choice, message, reqId, tag, elapsed };
  }
}
