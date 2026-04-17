// POST /api/tts — forwards to ElevenLabs /v1/text-to-speech/{voice}.
// Body: { text, voice, model_id?, voice_settings?, output_format? }
// Returns: audio/mpeg binary.

module.exports = async function (context, req) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    context.res = { status: 500, body: { error: 'ElevenLabs is not configured.' } };
    return;
  }

  const { text, voice, model_id, voice_settings, output_format } = req.body || {};
  if (!text || !voice) {
    context.res = { status: 400, body: { error: 'Missing text or voice.' } };
    return;
  }

  const fmt = output_format || 'mp3_44100_64';
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=${fmt}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: model_id || 'eleven_turbo_v2_5',
        voice_settings: voice_settings || {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      context.res = { status: upstream.status, body: { error: 'TTS upstream error', detail } };
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
      body: buf,
      isRaw: true,
    };
  } catch (err) {
    context.log.error('tts proxy failed', err);
    context.res = { status: 502, body: { error: 'Upstream error', detail: String(err) } };
  }
};
