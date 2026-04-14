// Scorer-orchestratie.
//
// Combineert de regelgebaseerde en ML-gebaseerde scorers op basis van
// de huidige modus. Regels draaien altijd synchroon (elke toets). ML
// draait gedebounced in 'ml' en 'hybrid' modus.
//
// Ook hier ligt de log-state: elke live evaluatie en elke test-bench
// run wordt bijgehouden voor de admin-pagina.

import { evaluateRules, evaluateSubjectRules } from './rules.js';
import { evaluateML, evaluateSubjectML } from './ml.js';
import { config } from './config.js';

// Body debounce
let debounceTimer = null;
let mlCancelToken = { cancelled: false };

// Subject debounce (parallel en onafhankelijk)
let subjectDebounceTimer = null;
let subjectCancelToken = { cancelled: false };

// Logs
const MAX_LOGS = 50;
const logs = [];
const logListeners = new Set();

function addLog(entry) {
  logs.unshift({ ...entry, timestamp: Date.now() });
  if (logs.length > MAX_LOGS) logs.pop();
  logListeners.forEach(fn => fn([...logs]));
}

export function subscribeLogs(fn) {
  logListeners.add(fn);
  fn([...logs]);
  return () => logListeners.delete(fn);
}

export function clearLogs() {
  logs.length = 0;
  logListeners.forEach(fn => fn([...logs]));
}

/**
 * Reactive evaluatie van tekst.
 *
 * Roept onUpdate meerdere keren aan:
 *   1. direct met alleen de regelscore (mlPending: true als ML verwacht wordt)
 *   2. later, na de debounce, met het ML-resultaat erbij (alleen in ml/hybrid)
 */
export function evaluate(text, onUpdate) {
  const mode = config.get('mode');
  const debounceMs = config.get('debounceMs') || 800;

  const rules = evaluateRules(text);

  // Cancel eventuele lopende ML-evaluatie
  if (debounceTimer) clearTimeout(debounceTimer);
  mlCancelToken.cancelled = true;

  // Eerste update: regels direct beschikbaar
  onUpdate({
    mode,
    rules,
    ml: null,
    mlPending: mode !== 'rules' && text.trim().length > 0
  });

  if (mode === 'rules' || !text.trim()) return;

  // Plan ML-evaluatie met debounce
  const token = { cancelled: false };
  mlCancelToken = token;

  debounceTimer = setTimeout(async () => {
    if (token.cancelled) return;
    try {
      const ml = await evaluateML(text);
      if (token.cancelled) return;

      onUpdate({ mode, rules, ml, mlPending: false });
      addLog({ text, rules, ml, mode, source: 'live' });
    } catch (err) {
      if (token.cancelled) return;
      onUpdate({
        mode,
        rules,
        ml: { score: null, error: err.message },
        mlPending: false
      });
    }
  }, debounceMs);
}

/**
 * Reactive evaluatie van de onderwerpregel.
 * Parallelle versie van evaluate() die subject-ankers gebruikt.
 */
export function evaluateSubject(text, onUpdate) {
  const mode = config.get('mode');
  const debounceMs = config.get('debounceMs') || 800;

  const rules = evaluateSubjectRules(text);

  if (subjectDebounceTimer) clearTimeout(subjectDebounceTimer);
  subjectCancelToken.cancelled = true;

  onUpdate({
    mode,
    rules,
    ml: null,
    mlPending: mode !== 'rules' && (text || '').trim().length > 0
  });

  if (mode === 'rules' || !(text || '').trim()) return;

  const token = { cancelled: false };
  subjectCancelToken = token;

  subjectDebounceTimer = setTimeout(async () => {
    if (token.cancelled) return;
    try {
      const ml = await evaluateSubjectML(text);
      if (token.cancelled) return;
      onUpdate({ mode, rules, ml, mlPending: false });
    } catch (err) {
      if (token.cancelled) return;
      onUpdate({
        mode,
        rules,
        ml: { score: null, band: null, error: err.message },
        mlPending: false
      });
    }
  }, debounceMs);
}

/**
 * Beide aanpakken direct en onvoorwaardelijk evalueren.
 * Gebruikt door de test-bench in de admin-pagina.
 */
export async function evaluateBoth(text) {
  const rules = evaluateRules(text);
  let ml;
  try {
    ml = await evaluateML(text);
  } catch (err) {
    ml = { score: null, error: err.message };
  }
  addLog({ text, rules, ml, mode: 'test', source: 'test-bench' });
  return { rules, ml };
}

/**
 * Bepaalt de definitieve score die wordt gebruikt voor de reactie
 * van de ontvanger. Hybride modus: gemiddelde van rules + ml.
 */
export function combinedScore(rules, ml) {
  const mode = config.get('mode');
  if (mode === 'rules' || !ml || ml.score == null) return rules.score;
  if (mode === 'ml') return ml.score;
  // hybride
  return Math.round((rules.score + ml.score) / 2);
}
