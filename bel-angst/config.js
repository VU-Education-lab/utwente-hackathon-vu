// ── config.js ──────────────────────────────────────────────────────────────
// Two providers:
//   - 'openai': user pastes their own sk-... key, stored in localStorage.
//               Browser talks to api.openai.com directly. No server needed.
//   - 'azure' : uses VU Azure infra. All key-bearing calls go through the
//               shared /api/* Functions on the same origin. The browser
//               never sees an Azure key.

// ── OPENAI (user-key, direct) ─────────────────────────────────────────────

const OPENAI = {
  name: 'openai',
  label: 'OpenAI direct',
  sublabel: 'Eigen API-sleutel (begint met sk-)',
  storageKey: 'oai_key',

  REALTIME_MODEL: 'gpt-4o-realtime-preview-2024-12-17',
  TOKEN_URL: 'https://api.openai.com/v1/realtime/sessions',
  SDP_URL: (model) => `https://api.openai.com/v1/realtime?model=${model}`,
  FEEDBACK_URL: 'https://api.openai.com/v1/chat/completions',

  tokenBody: (model, voice, instructions) => ({ model, voice, instructions }),
  extractToken: (data) => data.client_secret?.value,
  tokenHeaders: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  sdpHeaders: (token) => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/sdp' }),
  feedbackHeaders: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
  feedbackBody: (model, messages, max_tokens) => ({ model, messages, max_tokens }),
};

// ── AZURE (VU, via shared /api/* proxy) ───────────────────────────────────
// Everything points at same-origin /api/* endpoints. No keys in the browser.
// The realtime-token endpoint returns { value, sdpUrl }, so we resolve SDP_URL
// at runtime via sessionStorage rather than at module-load time.

const AZURE = {
  name: 'azure',
  label: 'Azure (VU)',
  sublabel: 'VU-infrastructuur · data blijft in Europa',
  storageKey: null,

  REALTIME_MODEL: 'gpt-4o-realtime',
  TOKEN_URL: '/api/realtime-token',
  // SDP URL comes back from /api/realtime-token in the token response body;
  // app.js stashes it on window.__belAzureSdpUrl and we read it here.
  SDP_URL: () => (typeof window !== 'undefined' && window.__belAzureSdpUrl) || '',
  FEEDBACK_URL: '/api/chat',
  FEEDBACK_DEPLOYMENT: 'gpt-4o-mini',

  // The proxy derives its own payload shape; we just forward the parts it needs.
  tokenBody: (model, voice, instructions) => ({ model, voice, instructions }),
  extractToken: (data) => {
    // Stash the sdpUrl for SDP_URL() above.
    if (typeof window !== 'undefined' && data.sdpUrl) window.__belAzureSdpUrl = data.sdpUrl;
    return data.value;
  },
  // No auth header — same-origin /api/* call.
  tokenHeaders: () => ({ 'Content-Type': 'application/json' }),
  // SDP call goes straight to Azure with the short-lived token (bearer).
  sdpHeaders: (token) => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/sdp' }),
  // Feedback goes through /api/chat — no auth header, deployment in body.
  feedbackHeaders: () => ({ 'Content-Type': 'application/json' }),
  feedbackBody: (_model, messages, max_tokens) => ({
    model: AZURE.FEEDBACK_DEPLOYMENT,
    messages,
    max_tokens,
  }),
};

// ── ACTIVE PROVIDER ──────────────────────────────────────────────────────

function getProvider() {
  const name = typeof localStorage !== 'undefined' ? localStorage.getItem('bel_provider') : null;
  return (name || 'openai') === 'azure' ? AZURE : OPENAI;
}

// ── CONFIG OBJECT ────────────────────────────────────────────────────────

const CONFIG = {
  get PROVIDER()      { return getProvider(); },
  get PROVIDER_NAME() { return getProvider().name; },

  // Azure mode returns '' — no key needed, the proxy holds it.
  get OPENAI_KEY() {
    const p = getProvider();
    return p.storageKey ? (localStorage.getItem(p.storageKey) || '') : '';
  },

  saveKey(key) {
    const p = getProvider();
    if (p.storageKey) localStorage.setItem(p.storageKey, key);
  },

  forgetKey() {
    const p = getProvider();
    if (p.storageKey) localStorage.removeItem(p.storageKey);
  },

  switchProvider(name) {
    localStorage.setItem('bel_provider', name);
  },

  get REALTIME_MODEL()       { return getProvider().REALTIME_MODEL; },
  get TOKEN_URL()            { return getProvider().TOKEN_URL; },
  get FEEDBACK_URL()         { return getProvider().FEEDBACK_URL; },
  SDP_URL(model)             { return getProvider().SDP_URL(model); },
  tokenBody(m, v, i)         { return getProvider().tokenBody(m, v, i); },
  extractToken(data)         { return getProvider().extractToken(data); },
  tokenHeaders(key)          { return getProvider().tokenHeaders(key); },
  sdpHeaders(token)          { return getProvider().sdpHeaders(token); },
  feedbackHeaders(key)       { return getProvider().feedbackHeaders(key); },
  feedbackBody(model, messages, max_tokens) {
    return getProvider().feedbackBody(model, messages, max_tokens);
  },

  FEEDBACK_MODEL: 'gpt-4o-mini',
  FEEDBACK_MAX_TOKENS: 800,
  AUDIO_CONSTRAINTS: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  TRANSCRIPTION_LANGUAGE: 'nl',
  RINGTONE_TONES: [[425, 0, 0.4], [450, 0, 0.4], [425, 0.5, 0.4], [450, 0.5, 0.4]],
  RINGTONE_VOLUME: 0.07,
  RINGTONE_INTERVAL_MS: 2000,
  RINGTONE_MIN_RINGS: 3,
  BREATH_PHASE_DURATION_MS: 4000,
};

export default CONFIG;
export { OPENAI, AZURE, getProvider };
