// Tiny logging helper.
//
// Every call:
//   1. Writes a colored line to the browser console (so you can still tail it
//      in devtools when you're playing).
//   2. POSTs the same entry to /__log, which the Vite dev plugin appends to
//      ./social-sim.log AND mirrors to the dev server's terminal stdout.
//
// In production builds (`npm run build`) /__log doesn't exist, so the POST
// silently fails — that's fine, the console line still happens.

const COLORS = {
  info:  'color:#7cc4ff',
  warn:  'color:#ffd166',
  error: 'color:#ff7b7b;font-weight:bold',
  debug: 'color:#97a0b3',
  ok:    'color:#6fe09b',
  director: 'color:#b88bff;font-weight:bold',
  speaker:  'color:#ffd166',
  pacing:   'color:#97a0b3',
  api:      'color:#7cc4ff',
};

function send(level, category, message, data) {
  // Console
  const style = COLORS[category] || COLORS[level] || '';
  if (style) {
    console.log(`%c[${category}] ${message}`, style, data ?? '');
  } else {
    console.log(`[${category}]`, message, data ?? '');
  }
  // Server log file (dev only — Vite middleware route).
  if (import.meta.env?.DEV) {
    try {
      const safeData = sanitizeForJSON(data);
      fetch('/__log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ts: new Date().toISOString(),
          level,
          category,
          message,
          data: safeData,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // never throw from a logger
    }
  }
}

function sanitizeForJSON(value, depth = 0) {
  if (depth > 5) return '[max depth]';
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (value instanceof Error) {
    return { message: value.message, name: value.name, stack: value.stack };
  }
  if (Array.isArray(value)) return value.slice(0, 30).map((v) => sanitizeForJSON(v, depth + 1));
  if (t === 'object') {
    const out = {};
    let i = 0;
    for (const k of Object.keys(value)) {
      if (i++ > 40) {
        out['…'] = `(${Object.keys(value).length - 40} more)`;
        break;
      }
      out[k] = sanitizeForJSON(value[k], depth + 1);
    }
    return out;
  }
  return String(value);
}

export const logger = {
  info:  (category, message, data) => send('info',  category, message, data),
  warn:  (category, message, data) => send('warn',  category, message, data),
  error: (category, message, data) => send('error', category, message, data),
  debug: (category, message, data) => send('debug', category, message, data),
};
