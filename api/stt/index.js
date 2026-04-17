// POST /api/stt — forwards a multipart audio upload to Azure OpenAI
// (whisper deployment on vu-speakeasy-ai). The client sends a normal
// multipart/form-data body with a `file` field; we add the api-key.

const API_VERSION = '2024-10-21';

module.exports = async function (context, req) {
  const endpoint   = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey     = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_STT_DEPLOYMENT || 'whisper';

  if (!endpoint || !apiKey) {
    context.res = { status: 500, body: { error: 'Azure OpenAI is not configured.' } };
    return;
  }

  const contentType = req.headers['content-type'] || req.headers['Content-Type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    context.res = { status: 400, body: { error: 'Expected multipart/form-data.' } };
    return;
  }

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/audio/transcriptions?api-version=${API_VERSION}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': contentType },
      body: req.rawBody instanceof Buffer ? req.rawBody : Buffer.from(req.rawBody || req.body),
    });

    const text = await upstream.text();
    context.res = {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
      body: text,
      isRaw: true,
    };
  } catch (err) {
    context.log.error('stt proxy failed', err);
    context.res = { status: 502, body: { error: 'Upstream error', detail: String(err) } };
  }
};
