// POST /api/stt — speech-to-text via Azure OpenAI whisper.
//
// We don't blindly forward req.rawBody: the Azure Functions v3 Node
// runtime sometimes hands multipart bodies over as a UTF-8 string, which
// silently corrupts binary audio. Instead we parse the incoming multipart
// with busboy, extract the file bytes as a proper Buffer, and re-POST to
// Azure with a fresh FormData. This is the only shape whisper's decoder
// reliably accepts for webm/opus (Chrome, Firefox) and mp4 (Safari).

const Busboy = require('busboy');

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

  // --- pick up the raw body in a binary-safe way ---
  const rawBody =
    Buffer.isBuffer(req.body)    ? req.body
    : Buffer.isBuffer(req.rawBody) ? req.rawBody
    : typeof req.rawBody === 'string'
        ? Buffer.from(req.rawBody, 'binary') // preserve bytes — runtime handed us a latin-1 string
        : Buffer.from(req.body || '');

  let parsed;
  try {
    parsed = await parseMultipart(rawBody, contentType);
  } catch (err) {
    context.log.error('stt multipart parse failed', err);
    context.res = { status: 400, body: { error: 'Could not parse multipart body.', detail: String(err) } };
    return;
  }

  if (!parsed.file || !parsed.file.bytes?.length) {
    context.res = { status: 400, body: { error: 'No file field in multipart body.' } };
    return;
  }

  context.log('stt forwarding', {
    filename: parsed.file.filename,
    mime: parsed.file.mimeType,
    bytes: parsed.file.bytes.length,
    extraFields: Object.keys(parsed.fields),
  });

  // --- re-upload to Azure with native FormData ---
  const form = new FormData();
  form.append(
    'file',
    new Blob([parsed.file.bytes], { type: parsed.file.mimeType || 'audio/webm' }),
    parsed.file.filename || 'recording.webm',
  );
  for (const [k, v] of Object.entries(parsed.fields)) {
    // Whisper on Azure: language, prompt, response_format, temperature are accepted.
    if (['language', 'prompt', 'response_format', 'temperature'].includes(k)) {
      form.append(k, v);
    }
  }

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/audio/transcriptions?api-version=${API_VERSION}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': apiKey },
      body: form,
    });

    const text = await upstream.text();
    context.res = {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
      body: text,
      isRaw: true,
    };
  } catch (err) {
    context.log.error('stt upstream failed', err);
    context.res = { status: 502, body: { error: 'Upstream error', detail: String(err) } };
  }
};

function parseMultipart(rawBody, contentType) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: { 'content-type': contentType } });
    const fields = {};
    const file = { bytes: null, filename: null, mimeType: null };

    bb.on('file', (_name, stream, info) => {
      file.filename = info?.filename || null;
      file.mimeType = info?.mimeType || null;
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => { file.bytes = Buffer.concat(chunks); });
    });
    bb.on('field', (name, value) => { fields[name] = value; });
    bb.on('error', reject);
    bb.on('close', () => resolve({ fields, file }));

    bb.end(rawBody);
  });
}
