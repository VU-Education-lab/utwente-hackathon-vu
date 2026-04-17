// POST /api/tts — forwards to Azure OpenAI Audio (Speech) on the same
// resource we use for chat. Body: { text, voice?, format? }. Returns audio.

const API_VERSION = '2025-03-01-preview';
const VALID_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'coral', 'sage', 'verse']);

module.exports = async function (context, req) {
  const endpoint   = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey     = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_TTS_DEPLOYMENT || 'tts';

  if (!endpoint || !apiKey) {
    context.res = { status: 500, body: { error: 'Azure OpenAI is not configured.' } };
    return;
  }

  const { text, voice, format } = req.body || {};
  if (!text) {
    context.res = { status: 400, body: { error: 'Missing text.' } };
    return;
  }

  const chosenVoice = VALID_VOICES.has(voice) ? voice : 'alloy';
  const responseFormat = ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'].includes(format) ? format : 'mp3';

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/audio/speech?api-version=${API_VERSION}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: deployment,
        input: text,
        voice: chosenVoice,
        response_format: responseFormat,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      context.res = { status: upstream.status, body: { error: 'TTS upstream error', detail } };
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    const mime = responseFormat === 'mp3' ? 'audio/mpeg'
      : responseFormat === 'wav' ? 'audio/wav'
      : responseFormat === 'opus' ? 'audio/ogg'
      : responseFormat === 'aac' ? 'audio/aac'
      : responseFormat === 'flac' ? 'audio/flac'
      : 'application/octet-stream';
    context.res = {
      status: 200,
      headers: { 'Content-Type': mime, 'Cache-Control': 'no-store' },
      body: buf,
      isRaw: true,
    };
  } catch (err) {
    context.log.error('tts proxy failed', err);
    context.res = { status: 502, body: { error: 'Upstream error', detail: String(err) } };
  }
};
