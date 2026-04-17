// POST /api/realtime-token — mints an ephemeral Azure OpenAI Realtime
// client_secret so the browser can open a WebRTC session without ever
// holding the long-lived Azure key.
//
// Body from client: { voice?, instructions?, model? }
// Returns: { value: '<ephemeral-token>', expires_at?, model, sdpUrl }

module.exports = async function (context, req) {
  const endpoint   = process.env.AZURE_REALTIME_ENDPOINT;
  const apiKey     = process.env.AZURE_REALTIME_API_KEY;
  const deployment = process.env.AZURE_REALTIME_DEPLOYMENT || 'gpt-4o-realtime';

  if (!endpoint || !apiKey) {
    context.res = { status: 500, body: { error: 'Realtime is not configured.' } };
    return;
  }

  const { voice, instructions, model } = req.body || {};
  const chosenModel = model || deployment;

  const payload = {
    session: {
      type: 'realtime',
      model: chosenModel,
      ...(instructions ? { instructions } : {}),
      ...(voice ? { audio: { output: { voice } } } : {}),
    },
  };

  const tokenUrl = `${endpoint.replace(/\/$/, '')}/openai/v1/realtime/client_secrets`;

  try {
    const upstream = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      context.res = { status: upstream.status, body: { error: 'Upstream error', detail: text } };
      return;
    }
    const data = JSON.parse(text);
    // Azure returns { value, expires_at, ... }. Tack on the SDP URL the
    // browser should hit, so the client doesn't need to know the endpoint shape.
    const sdpUrl = `${endpoint.replace(/\/$/, '')}/openai/v1/realtime/calls?webrtcfilter=on`;
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: { value: data.value, expires_at: data.expires_at, model: chosenModel, sdpUrl },
    };
  } catch (err) {
    context.log.error('realtime-token failed', err);
    context.res = { status: 502, body: { error: 'Upstream error', detail: String(err) } };
  }
};
