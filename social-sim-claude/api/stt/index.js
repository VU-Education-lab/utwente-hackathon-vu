// POST /api/stt — forwards a multipart audio upload to ElevenLabs Scribe.
// We pass the raw request body through so the boundary stays intact.

module.exports = async function (context, req) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    context.res = { status: 500, body: { error: 'ElevenLabs is not configured.' } };
    return;
  }

  const contentType = req.headers['content-type'] || req.headers['Content-Type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    context.res = { status: 400, body: { error: 'Expected multipart/form-data.' } };
    return;
  }

  try {
    const upstream = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': contentType,
      },
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
