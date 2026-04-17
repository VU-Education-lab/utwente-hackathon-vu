// ── config.js ──────────────────────────────────────────────────────────────
// Bel-oefening talks exclusively to Azure OpenAI via the shared /api/*
// Functions on the same origin. The browser never sees an Azure key.

// Realtime-token endpoint returns { value, sdpUrl } — we stash sdpUrl on
// window.__belAzureSdpUrl and read it from SDP_URL().

const CONFIG = {
  REALTIME_MODEL: 'gpt-4o-realtime',
  TOKEN_URL: '/api/realtime-token',
  SDP_URL: () => (typeof window !== 'undefined' && window.__belAzureSdpUrl) || '',
  FEEDBACK_URL: '/api/chat',
  FEEDBACK_MODEL: 'gpt-4o-mini',
  FEEDBACK_MAX_TOKENS: 800,

  // The proxy derives its own payload shape; we just forward the parts it needs.
  tokenBody: (model, voice, instructions) => ({ model, voice, instructions }),
  extractToken: (data) => {
    if (typeof window !== 'undefined' && data.sdpUrl) window.__belAzureSdpUrl = data.sdpUrl;
    return data.value;
  },
  // Same-origin /api/* call — no auth header needed.
  tokenHeaders:    () => ({ 'Content-Type': 'application/json' }),
  // SDP call goes straight to Azure with the short-lived token (bearer).
  sdpHeaders:      (token) => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/sdp' }),
  // Feedback goes through /api/chat — no auth header; deployment in body.
  feedbackHeaders: () => ({ 'Content-Type': 'application/json' }),

  AUDIO_CONSTRAINTS: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  TRANSCRIPTION_LANGUAGE: 'nl',
  RINGTONE_TONES: [[425, 0, 0.4], [450, 0, 0.4], [425, 0.5, 0.4], [450, 0.5, 0.4]],
  RINGTONE_VOLUME: 0.07,
  RINGTONE_INTERVAL_MS: 2000,
  RINGTONE_MIN_RINGS: 3,
  BREATH_PHASE_DURATION_MS: 4000,
};

export default CONFIG;
