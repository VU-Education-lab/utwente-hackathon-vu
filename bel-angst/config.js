// ── config.js ──────────────────────────────────────────────────────────────
// Alle instelbare parameters op één plek.
// Ondersteunt twee providers: 'openai' (direct) en 'azure' (VU).
// Wissel van provider via het keuzescherm bij opstarten.
//
// SECURITY: deze file wordt naar de browser gestuurd. Er staan hier GEEN
// hardcoded API-keys meer in. De Azure endpoints/keys worden via
// loadRuntimeConfig() opgehaald — op Azure Static Web Apps via `/api/config`
// (server-side proxy), lokaal via `window.BEL_ANGST_CONFIG` in index.html
// (dev-only, gitignored).

// ── RUNTIME CONFIG ─────────────────────────────────────────────────────────
// Wordt gevuld door loadRuntimeConfig() voor de app start. Tot dat moment
// zijn de Azure getters leeg en vraagt de app de gebruiker om zijn OpenAI
// sleutel te plakken.
let runtimeConfig = null;

export async function loadRuntimeConfig() {
  // 1) Productie: Static Web Apps managed Function op /api/config geeft de
  //    non-secret endpoints + een kortlevende token terug (geen raw key).
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    if (res.ok) { runtimeConfig = await res.json(); return; }
  } catch { /* ignore — fall through */ }
  // 2) Dev: inline <script>window.BEL_ANGST_CONFIG = { ... }</script> in
  //    index.html, gevuld uit een lokaal (gitignored) bestand.
  if (typeof window !== 'undefined' && window.BEL_ANGST_CONFIG) {
    runtimeConfig = window.BEL_ANGST_CONFIG;
  }
}

// ── PROVIDER CONFIGURATIES ─────────────────────────────────────────────────

const OPENAI = {
  name: 'openai',
  label: 'OpenAI direct',
  sublabel: 'Eigen API-sleutel (begint met sk-)',
  storageKey: 'oai_key',

  REALTIME_MODEL: 'gpt-4o-realtime-preview-2024-12-17',
  TOKEN_URL: 'https://api.openai.com/v1/realtime/sessions',
  SDP_URL: (model) => `https://api.openai.com/v1/realtime?model=${model}`,
  FEEDBACK_URL: 'https://api.openai.com/v1/chat/completions',

  // Token request: vlak object
  tokenBody: (model, voice, instructions) => ({ model, voice, instructions }),
  // Token response: { client_secret: { value: '...' } }
  extractToken: (data) => data.client_secret?.value,
  // Auth headers
  tokenHeaders: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
  sdpHeaders: (token) => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/sdp' }),
  feedbackHeaders: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
};

const AZURE = {
  name: 'azure',
  label: 'Azure (VU)',
  sublabel: 'VU-infrastructuur · data blijft in Europa',
  storageKey: null, // geen sleutel nodig

  // Realtime resource — voor het live gesprek (gpt-4o-realtime deployment).
  // Endpoints en keys worden NIET hardcoded: ze komen uit een runtime config
  // fetch (/api/config voor Azure Static Web Apps, window.BEL_ANGST_CONFIG
  // voor lokale runs). Zie loadRuntimeConfig() hieronder.
  get ENDPOINT()       { return runtimeConfig?.AZURE_REALTIME_ENDPOINT || ''; },
  get AZURE_KEY()      { return runtimeConfig?.AZURE_REALTIME_KEY || ''; },

  // Feedback / chat-completions resource.
  get FEEDBACK_ENDPOINT()   { return runtimeConfig?.AZURE_FEEDBACK_ENDPOINT || ''; },
  FEEDBACK_DEPLOYMENT:      'gpt-4o-mini',
  get FEEDBACK_KEY()        { return runtimeConfig?.AZURE_FEEDBACK_KEY || ''; },

  REALTIME_MODEL: 'gpt-4o-realtime',
  get TOKEN_URL() { return `${this.ENDPOINT}/openai/v1/realtime/client_secrets`; },
  SDP_URL: () => 'https://bel-oefening-openai.openai.azure.com/openai/v1/realtime/calls?webrtcfilter=on',
  get FEEDBACK_URL() { return `${this.FEEDBACK_ENDPOINT}/openai/v1/chat/completions`; },

  // Token request: genest session object (Azure GA formaat)
  tokenBody: (model, voice, instructions) => ({
    session: { type: 'realtime', model, instructions, audio: { output: { voice } } },
  }),
  // Token response: { value: '...' }
  extractToken: (data) => data.value,
  // Auth headers
  tokenHeaders: function() { return { 'api-key': this.AZURE_KEY, 'Content-Type': 'application/json' }; },
  sdpHeaders: (token) => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/sdp' }),
  // Azure chat-completions gebruikt `api-key` header in plaats van Bearer.
  feedbackHeaders: function() { return { 'Content-Type': 'application/json', 'api-key': this.FEEDBACK_KEY }; },
};

// ── ACTIEVE PROVIDER ───────────────────────────────────────────────────────

function getProvider() {
  const name = localStorage.getItem('bel_provider') || 'openai';
  return name === 'azure' ? AZURE : OPENAI;
}

// ── CONFIG OBJECT ──────────────────────────────────────────────────────────

const CONFIG = {
  get PROVIDER()      { return getProvider(); },
  get PROVIDER_NAME() { return getProvider().name; },

  // Sleutel voor actieve provider (voor OpenAI; Azure gebruikt hardcoded key)
  get OPENAI_KEY() {
    const p = getProvider();
    return p.storageKey ? (localStorage.getItem(p.storageKey) || '') : p.AZURE_KEY;
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

  // Proxy naar actieve provider
  get REALTIME_MODEL()  { return getProvider().REALTIME_MODEL; },
  get TOKEN_URL()       { return getProvider().TOKEN_URL; },
  get FEEDBACK_URL()    { return getProvider().FEEDBACK_URL; },
  SDP_URL(model)        { return getProvider().SDP_URL(model); },
  tokenBody(m, v, i)    { return getProvider().tokenBody(m, v, i); },
  extractToken(data)    { return getProvider().extractToken(data); },
  tokenHeaders(key)     { return getProvider().tokenHeaders(key); },
  sdpHeaders(token)     { return getProvider().sdpHeaders(token); },
  feedbackHeaders(key)  { return getProvider().feedbackHeaders(key); },

  // Identiek voor beide providers
  FEEDBACK_MODEL: 'gpt-4o-mini',
  FEEDBACK_MAX_TOKENS: 800,
  AUDIO_CONSTRAINTS: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  TRANSCRIPTION_LANGUAGE: 'nl',
  RINGTONE_TONES: [[425, 0, 0.4], [450, 0, 0.4], [425, 0.5, 0.4], [450, 0.5, 0.4]],
  RINGTONE_VOLUME: 0.07,
  RINGTONE_INTERVAL_MS: 2000,
  RINGTONE_MIN_RINGS: 3,        // minimaal 3 keer overgaan voor verbinden
  BREATH_PHASE_DURATION_MS: 4000,
};

export default CONFIG;
export { OPENAI, AZURE, getProvider };
