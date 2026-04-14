// Transformers.js wrapper.
//
// Laadt het embedding-model `Xenova/multilingual-e5-small` (~120 MB,
// gecached in de browser na de eerste download). Berekent embeddings
// van de anker-zinnen eenmalig, en scoort nieuwe tekst via
// contrastieve cosinus-gelijkenis + softmax-gewogen gemiddelde.
//
// De module is stateful: na loadModel() kun je evaluateML() aanroepen.
// Status-wijzigingen kun je volgen via subscribeMl().
//
// === Contrastieve centrering (Optie B uit het advies) ===
// Embedding-modellen laten onderwerp-gelijkenis veel sterker meewegen
// dan stijl-gelijkenis. Omdat alle ankers over hetzelfde onderwerp gaan
// (herkansing, zieke oma), liggen hun vectoren in een smalle "wolk"
// dicht bij elkaar. We trekken daarom de gemiddelde ankervector af
// (de "topic bias") voordat we vergelijken. Wat overblijft is de
// residuele variatie, die sterker correleert met register.

import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';
import { ANCHORS, SUBJECT_ANCHORS } from './anchors.js';
import { config } from './config.js';

// Softmax-temperatuur voor het omzetten van similarities in gewichten.
// Hoger = scherpere weging (sterkere voorkeur voor het dichtstbijzijnde
// anker). Na contrastieve centrering zijn de similarities wijder
// gespreid, dus 50 is een goede default. De waarde wordt live uit
// config gelezen zodat de admin-slider onmiddellijk effect heeft.
const DEFAULT_SOFTMAX_TEMPERATURE = 50;

let extractor = null;
let loadingPromise = null;

// Body-ankers
let anchorEmbeddings = null;   // ruwe (ongecenterde) embeddings, voor referentie
let anchorMean = null;          // centroid van alle body anker-embeddings
let centeredAnchors = null;     // gecenterde + hergenormaliseerde body-ankers

// Subject-ankers (parallel, eigen centroid)
let subjectAnchorEmbeddings = null;
let subjectAnchorMean = null;
let centeredSubjectAnchors = null;

const mlState = {
  status: 'idle',       // 'idle' | 'loading' | 'ready' | 'error'
  loadProgress: 0,
  errorMessage: null
};

const listeners = new Set();

function emit() {
  listeners.forEach(fn => fn({ ...mlState }));
}

export function subscribeMl(fn) {
  listeners.add(fn);
  fn({ ...mlState });
  return () => listeners.delete(fn);
}

export function getMlStatus() {
  return { ...mlState };
}

async function embed(text) {
  // e5-modellen verwachten een "query: " prefix voor de invoer.
  const output = await extractor(`query: ${text}`, {
    pooling: 'mean',
    normalize: true
  });
  return Array.from(output.data);
}

// ---- Vector-helpers ----

function vecMean(vectors) {
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) result[i] += v[i];
  }
  for (let i = 0; i < dim; i++) result[i] /= vectors.length;
  return result;
}

function vecSub(a, b) {
  const result = new Array(a.length);
  for (let i = 0; i < a.length; i++) result[i] = a[i] - b[i];
  return result;
}

function normalize(v) {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return v.slice();
  const result = new Array(v.length);
  for (let i = 0; i < v.length; i++) result[i] = v[i] / norm;
  return result;
}

function cosineSim(a, b) {
  // Beide vectoren zijn genormaliseerd, dus dot product = cosinus.
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function softmax(xs, temperature = DEFAULT_SOFTMAX_TEMPERATURE) {
  const max = Math.max(...xs);
  const exps = xs.map(x => Math.exp((x - max) * temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

export async function loadModel(modelName = 'Xenova/multilingual-e5-small') {
  if (mlState.status === 'ready') return;
  if (loadingPromise) return loadingPromise;

  mlState.status = 'loading';
  mlState.loadProgress = 0;
  mlState.errorMessage = null;
  emit();

  loadingPromise = (async () => {
    try {
      extractor = await pipeline('feature-extraction', modelName, {
        progress_callback: (data) => {
          if (data && typeof data.progress === 'number') {
            mlState.loadProgress = Math.round(data.progress);
            emit();
          }
        }
      });

      // Pre-compute body anker-embeddings zodat elke volgende evaluatie snel is.
      anchorEmbeddings = [];
      for (const anchor of ANCHORS) {
        const emb = await embed(anchor.text);
        anchorEmbeddings.push({ ...anchor, embedding: emb });
      }

      // Contrastieve centrering voor body-ankers.
      const rawEmbs = anchorEmbeddings.map(a => a.embedding);
      anchorMean = vecMean(rawEmbs);
      centeredAnchors = anchorEmbeddings.map(a => ({
        ...a,
        centered: normalize(vecSub(a.embedding, anchorMean))
      }));

      // Hetzelfde voor subject-ankers, met een eigen centroid.
      subjectAnchorEmbeddings = [];
      for (const anchor of SUBJECT_ANCHORS) {
        const emb = await embed(anchor.text);
        subjectAnchorEmbeddings.push({ ...anchor, embedding: emb });
      }
      const rawSubjectEmbs = subjectAnchorEmbeddings.map(a => a.embedding);
      subjectAnchorMean = vecMean(rawSubjectEmbs);
      centeredSubjectAnchors = subjectAnchorEmbeddings.map(a => ({
        ...a,
        centered: normalize(vecSub(a.embedding, subjectAnchorMean))
      }));

      mlState.status = 'ready';
      mlState.loadProgress = 100;
      emit();
    } catch (err) {
      console.error('[ml] Model loading failed:', err);
      mlState.status = 'error';
      mlState.errorMessage = err.message || 'Onbekende fout';
      loadingPromise = null;
      emit();
      throw err;
    }
  })();

  return loadingPromise;
}

export async function evaluateML(text) {
  if (!text.trim()) {
    return { score: 50, topAnchors: [], ready: mlState.status === 'ready' };
  }

  if (mlState.status !== 'ready') {
    return { score: null, topAnchors: [], ready: false };
  }

  // Embed de invoer, trek de anker-centroid af, hernormaliseer.
  const rawEmb = await embed(text);
  const centeredInput = normalize(vecSub(rawEmb, anchorMean));

  // Ruwe similariteit (vóór centrering) — gebruikt door de guardrail
  // om te beoordelen of de tekst überhaupt in de buurt van het
  // scenario-onderwerp ligt. Anchors en rawEmb zijn beide al
  // genormaliseerd, dus dot product = cosinus-gelijkenis.
  const rawSims = anchorEmbeddings.map(a => cosineSim(rawEmb, a.embedding));
  const maxRawSim = Math.max(...rawSims);

  // Vergelijk in de gecenterde ruimte: na centrering kunnen similarities
  // negatief zijn (vectoren wijzen dan "tegenovergesteld" t.o.v. het
  // gedeelde topic-signaal), wat prima is voor softmax.
  const sims = centeredAnchors.map(a => cosineSim(centeredInput, a.centered));
  const temperature = config.get('softmaxTemperature') ?? DEFAULT_SOFTMAX_TEMPERATURE;
  const weights = softmax(sims, temperature);
  const score = weights.reduce((acc, w, i) => acc + w * centeredAnchors[i].score, 0);

  const ranked = centeredAnchors
    .map((a, i) => ({
      label: a.label,
      score: a.score,
      sim: sims[i],
      weight: weights[i]
    }))
    .sort((a, b) => b.sim - a.sim);

  return {
    score: Math.round(score),
    topAnchors: ranked.slice(0, 3),
    maxRawSim,
    ready: true
  };
}

// ============================================================
// Subject scoring — kwaliteit van de onderwerpregel
// ============================================================

export async function evaluateSubjectML(text) {
  if (!text || !text.trim()) {
    return { score: null, band: null, topAnchors: [], ready: mlState.status === 'ready' };
  }

  if (mlState.status !== 'ready') {
    return { score: null, band: null, topAnchors: [], ready: false };
  }

  // Embed de invoer en trek de subject-centroid af.
  const rawEmb = await embed(text);
  const centeredInput = normalize(vecSub(rawEmb, subjectAnchorMean));

  const sims = centeredSubjectAnchors.map(a => cosineSim(centeredInput, a.centered));
  const temperature = config.get('softmaxTemperature') ?? DEFAULT_SOFTMAX_TEMPERATURE;
  const weights = softmax(sims, temperature);
  const score = weights.reduce((acc, w, i) => acc + w * centeredSubjectAnchors[i].score, 0);

  const ranked = centeredSubjectAnchors
    .map((a, i) => ({
      label: a.label,
      score: a.score,
      sim: sims[i],
      weight: weights[i]
    }))
    .sort((a, b) => b.sim - a.sim);

  const rounded = Math.round(score);
  let band;
  if (rounded < 35)      band = 'zwak';
  else if (rounded < 65) band = 'matig';
  else                   band = 'goed';

  return {
    score: rounded,
    band,
    topAnchors: ranked.slice(0, 3),
    ready: true
  };
}
