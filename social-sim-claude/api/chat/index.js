// POST /api/chat — forwards to Azure OpenAI v1 chat-completions.
// Keys live in Application Settings; the browser never sees them.

module.exports = async function (context, req) {
  const endpoint   = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiKey     = process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint || !deployment || !apiKey) {
    context.res = { status: 500, body: { error: 'Azure OpenAI is not configured.' } };
    return;
  }

  const payload = req.body || {};
  const body = {
    model:       payload.model || deployment,
    messages:    payload.messages || [],
    temperature: payload.temperature ?? 0.9,
    max_tokens:  payload.max_tokens ?? payload.maxTokens ?? 700,
  };

  const url = `${endpoint.replace(/\/$/, '')}/openai/v1/chat/completions`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    context.res = {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
      body: text,
      isRaw: true,
    };
  } catch (err) {
    context.log.error('chat proxy failed', err);
    context.res = { status: 502, body: { error: 'Upstream error', detail: String(err) } };
  }
};
