// Thin wrapper around the OpenRouter chat completions API.
//
// Endpoint: POST https://openrouter.ai/api/v1/chat/completions
// Auth:     Authorization: Bearer <key>
// Body:     OpenAI-compatible {model, messages, temperature, max_tokens, ...}
//
// Docs: https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request
//
// NOTE on browser usage: putting an OpenRouter key in a browser app exposes
// it to anyone who opens devtools. That's fine for a local hackathon prototype
// but should NOT be done in production. The README explains this.

import { logger } from '../util/logger.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterClient {
  constructor({ apiKey, model = 'openrouter/auto', appTitle, appUrl }) {
    this.apiKey = apiKey;
    this.model = model;
    this.appTitle = appTitle || 'Social Sim';
    this.appUrl = appUrl || 'http://localhost:5173';
  }

  isReady() {
    return Boolean(this.apiKey && this.apiKey.startsWith('sk-or-'));
  }

  /**
   * Send a chat completion request and return the assistant message text.
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {object} [opts]
   * @param {number} [opts.temperature]
   * @param {number} [opts.maxTokens]
   * @param {AbortSignal} [opts.signal]
   * @returns {Promise<string>}
   */
  async chat(messages, opts = {}) {
    const { data, message, reqId, tag, elapsed } = await this._post(messages, opts);

    // Some models put the answer in `content`, some in `reasoning` (reasoning
    // models), some in `reasoning_content`, and a few wrap it in tool calls.
    // Try them in order of preference.
    let text =
      (typeof message?.content === 'string' && message.content.trim()) ||
      (Array.isArray(message?.content) &&
        message.content
          .filter((p) => p?.type === 'text' && p?.text)
          .map((p) => p.text)
          .join(' ')
          .trim()) ||
      (typeof message?.reasoning === 'string' && message.reasoning.trim()) ||
      (typeof message?.reasoning_content === 'string' && message.reasoning_content.trim()) ||
      '';

    if (!text) {
      const finishReason = data?.choices?.[0]?.finish_reason;
      const reasoningTokens = data?.usage?.completion_tokens_details?.reasoning_tokens;
      const completionTokens = data?.usage?.completion_tokens;

      // Most common cause: the model spent its entire token budget on
      // reasoning and had nothing left for the actual answer. Surface this
      // explicitly so it's obvious what to fix.
      if (finishReason === 'length') {
        logger.error('api',
          `[${reqId}]${tag} TOKEN LIMIT HIT — model spent all ${completionTokens} tokens (incl. ${reasoningTokens} reasoning) and had no room for the answer. BUMP max_tokens.`,
          {
            finishReason,
            reasoningTokens,
            completionTokens,
            provider: data?.provider,
            modelUsed: data?.model,
          });
      } else {
        logger.error('api', `[${reqId}]${tag} empty completion after ${elapsed}ms`, {
          fullResponse: data,
          message,
          finishReason,
          reasoningTokens,
          provider: data?.provider,
          modelUsed: data?.model,
        });
      }
      throw new Error('OpenRouter returned no completion content.');
    }

    logger.info('api', `[${reqId}]${tag} ← ${elapsed}ms`, {
      textPreview: text.slice(0, 160),
      usage: data?.usage,
      modelUsed: data?.model,
      provider: data?.provider,
    });

    return text.trim();
  }

  // ----------- shared HTTP path -----------
  async _post(messages, opts) {
    if (!this.isReady()) {
      throw new Error('OpenRouter API key is not configured.');
    }

    const body = {
      model: this.model,
      messages,
      temperature: opts.temperature ?? 0.9,
      // We ASK for a tiny reasoning budget below, but in practice some
      // providers (notably Chutes for gpt-oss-120b) ignore that setting and
      // burn 100-300 tokens on reasoning anyway. So we need enough headroom
      // for reasoning + the actual answer + a safety margin. Hitting the
      // ceiling silently produces `content: null` with `finish_reason: length`.
      max_tokens: opts.maxTokens ?? 700,
      // We can't always FORCE reasoning off — some endpoints (e.g. gpt-oss-120b)
      // reject `effort: "none"` with HTTP 400 because reasoning is mandatory.
      // Asking to *exclude* the reasoning from the response is universally
      // accepted: the model still reasons server-side, but the reasoning
      // tokens aren't returned to us. The `max_tokens: 20` request is a HINT
      // — providers that respect it will keep reasoning short, providers that
      // don't will spend whatever they want.
      // Docs: https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
      reasoning: {
        max_tokens: 20,
        exclude: true,
      },
      // Skip providers that we've observed ignoring the reasoning cap and
      // therefore burning the entire token budget on reasoning. Add more
      // here if you spot the same pattern with other providers in the log.
      provider: {
        ignore: ['Chutes'],
      },
    };

    const reqId = Math.random().toString(36).slice(2, 8);
    const tag = opts.tag ? ` [${opts.tag}]` : '';
    const t0 = performance.now();

    logger.info('api', `[${reqId}]${tag} → POST`, {
      model: body.model,
      messageCount: messages.length,
      temperature: body.temperature,
      maxTokens: body.max_tokens,
      lastMessagePreview:
        (messages[messages.length - 1]?.content || '').slice(0, 140) + '…',
    });

    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.appUrl,
          'X-Title': this.appTitle,
        },
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
      try {
        parsed = await response.json();
        detail = parsed?.error?.message || JSON.stringify(parsed);
      } catch {
        detail = await response.text();
      }
      logger.error('api', `[${reqId}]${tag} HTTP ${response.status} after ${elapsed}ms`, {
        status: response.status,
        detail,
        parsed,
      });
      const err = new Error(`OpenRouter ${response.status}: ${detail}`);
      err.status = response.status;
      err.detail = detail;
      err.fatal = response.status === 401 || response.status === 402 || response.status === 429;
      throw err;
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const message = choice?.message;

    return { data, choice, message, reqId, tag, elapsed };
  }
}
