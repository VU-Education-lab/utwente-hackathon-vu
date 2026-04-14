// Admin-pagina: modus-keuze, modelstatus, instellingen, test-bench, logs.

import { config } from './engine/config.js';
import { loadModel, subscribeMl, getMlStatus } from './engine/ml.js';
import { evaluateBoth, subscribeLogs, clearLogs } from './engine/scorer.js';
import {
  getScenario,
  getVariantsForScenario,
  getReactionForScore,
  scoreInZone
} from './engine/scenarios.js';
import { FACES, FACE_LABELS } from './engine/faces.js';

// Lokale state voor de test-bench: welke variant wordt gebruikt voor
// de interpretatie. Onafhankelijk van de "live" actieve variant in
// config — admin-testen mag de student-flow niet beïnvloeden.
let testVariantId = 'herkansing-formeel';

const TEST_SAMPLES = [
  {
    label: "A — heel informeel, kort",
    text: "yo prof ff een vraagje kan ik morgen herkansen?? mn oma is ziek"
  },
  {
    label: "B — informeel met emoji",
    text: "Hoi prof Hendriks! Sorry maar ik kan morgen echt niet komen voor het tentamen 😔 mijn oma ligt in het ziekenhuis. Kan ik een herkansing doen? Groetjes"
  },
  {
    label: "C — neutraal-beleefd",
    text: "Beste meneer Hendriks, ik kan morgen helaas niet bij het tentamen zijn omdat mijn oma is opgenomen in het ziekenhuis. Zou het mogelijk zijn een herkansing af te spreken? Bedankt alvast. Groeten, Sanne"
  },
  {
    label: "D — goed gekalibreerd formeel",
    text: "Geachte heer Hendriks, hierbij verzoek ik u vriendelijk om een herkansing voor het tentamen Cultuurgeschiedenis van morgen. Mijn grootmoeder is gisteren plotseling opgenomen in het ziekenhuis en ik kan daardoor niet aanwezig zijn. Ik hoop dat u begrip heeft voor deze situatie. Met vriendelijke groet, Sanne de Vries"
  },
  {
    label: "E — overdreven formeel",
    text: "Hooggeachte heer professor doctor Hendriks, met de meeste hoogachting wend ik mij tot u in de hoop dat u welwillend zou willen overwegen mij een gelegenheid tot herkansing te verlenen. Uw dienstwillige dienaar, S. de Vries."
  },
  {
    label: "F — gemengd: formeel begin, informeel einde",
    text: "Geachte heer Hendriks, helaas kan ik morgen niet komen 😢 mijn oma is in het ziekenhuis. Is een herkansing mogelijk? groetjes Sanne"
  },
  {
    label: "G — kort en zakelijk",
    text: "Meneer Hendriks, ik kan morgen niet bij het tentamen zijn wegens een familieomstandigheid. Graag zou ik een herkansing willen aanvragen. Met vriendelijke groet, Sanne de Vries"
  },
  {
    label: "H — correcte structuur, te joviaal",
    text: "Beste Prof. Hendriks, helaas heb ik groot nieuws te melden. Mijn oma is gisteren helaas in het ziekenhuis beland en ik moet nu bij haar zijn. Dat is echt super vervelend want ik had me zo goed voorbereid op dit tentamen! Zou u het erg vinden om mij een herkansing te geven? Dat zou top zijn. Alvast super bedankt! Groetjes, Sanne"
  }
];

export function initAdmin() {
  // === Modus-selector ===
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  modeRadios.forEach(radio => {
    if (radio.value === config.get('mode')) radio.checked = true;
    radio.addEventListener('change', () => {
      if (radio.checked) config.set('mode', radio.value);
    });
  });

  // === Modelstatus ===
  const statusDot    = document.getElementById('statusDot');
  const statusText   = document.getElementById('statusText');
  const progress     = document.getElementById('progress');
  const progressBar  = document.getElementById('progressBar');
  const loadBtn      = document.getElementById('loadModelBtn');

  subscribeMl(({ status, loadProgress, errorMessage }) => {
    statusDot.className = 'status-dot ' + status;

    if (status === 'idle') {
      statusText.textContent = 'Niet geladen';
      progress.style.display = 'none';
      loadBtn.textContent = 'Laad model';
      loadBtn.disabled = false;
    } else if (status === 'loading') {
      statusText.textContent = `Laden... ${loadProgress}%`;
      progress.style.display = 'block';
      progressBar.style.width = loadProgress + '%';
      loadBtn.textContent = 'Bezig met laden...';
      loadBtn.disabled = true;
    } else if (status === 'ready') {
      statusText.textContent = 'Klaar voor gebruik';
      progress.style.display = 'none';
      loadBtn.textContent = 'Geladen ✓';
      loadBtn.disabled = true;
    } else if (status === 'error') {
      statusText.textContent = 'Fout: ' + (errorMessage || 'onbekend');
      progress.style.display = 'none';
      loadBtn.textContent = 'Opnieuw proberen';
      loadBtn.disabled = false;
    }
  });

  loadBtn.addEventListener('click', () => {
    loadModel().catch(err => console.error('[admin] load error:', err));
  });

  // Auto-laad het model als de huidige modus het nodig heeft
  const currentMode = config.get('mode');
  if (currentMode !== 'rules' && getMlStatus().status === 'idle') {
    loadModel().catch(() => {});
  }
  config.subscribe((key, val) => {
    if (key === 'mode' && val !== 'rules' && getMlStatus().status === 'idle') {
      loadModel().catch(() => {});
    }
  });

  // === Debounce-slider ===
  const slider = document.getElementById('debounceSlider');
  const sliderValue = document.getElementById('debounceValue');
  slider.value = config.get('debounceMs') || 800;
  sliderValue.textContent = slider.value + 'ms';
  slider.addEventListener('input', () => {
    sliderValue.textContent = slider.value + 'ms';
    config.set('debounceMs', parseInt(slider.value));
  });

  // === Softmax-temperatuur slider ===
  const tempSlider = document.getElementById('softmaxTempSlider');
  const tempValue = document.getElementById('softmaxTempValue');
  tempSlider.value = config.get('softmaxTemperature') || 50;
  tempValue.textContent = tempSlider.value;
  tempSlider.addEventListener('input', () => {
    tempValue.textContent = tempSlider.value;
    config.set('softmaxTemperature', parseInt(tempSlider.value));
  });

  // === Test-bench ===
  const testSamples = document.getElementById('testSamples');
  const testInput   = document.getElementById('testInput');
  const evaluateBtn = document.getElementById('evaluateBtn');
  const testResults = document.getElementById('testResults');

  TEST_SAMPLES.forEach((sample, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = sample.label;
    testSamples.appendChild(option);
  });

  // === Scenario + variant selectors voor de test-bench ===
  // Bepalen alleen hoe de scores worden geïnterpreteerd (target-zone,
  // voorspelde reactie). De rules- en ML-scoring zelf is universeel.
  const testScenarioSelect = document.getElementById('testScenarioSelect');
  const testVariantSelect = document.getElementById('testVariantSelect');

  function fillVariantOptions(scenarioKey) {
    testVariantSelect.innerHTML = '';
    const variants = getVariantsForScenario(scenarioKey);
    variants.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.label} — ${v.character.name}`;
      testVariantSelect.appendChild(opt);
    });
    if (variants.length > 0) {
      testVariantId = variants[0].id;
      testVariantSelect.value = testVariantId;
    }
  }

  fillVariantOptions(testScenarioSelect.value);

  testScenarioSelect.addEventListener('change', () => {
    fillVariantOptions(testScenarioSelect.value);
    testResults.innerHTML = '';
  });

  testVariantSelect.addEventListener('change', () => {
    testVariantId = testVariantSelect.value;
    testResults.innerHTML = '';
  });

  testSamples.addEventListener('change', () => {
    const idx = parseInt(testSamples.value);
    if (!isNaN(idx)) {
      testInput.value = TEST_SAMPLES[idx].text;
    }
    // Wis oude resultaten zodat je niet per ongeluk naar een vorige
    // evaluatie kijkt terwijl de input al gewijzigd is.
    testResults.innerHTML = '';
  });

  testInput.addEventListener('input', () => {
    // Ook bij handmatig typen of plakken oude resultaten wissen.
    testResults.innerHTML = '';
  });

  evaluateBtn.addEventListener('click', async () => {
    const text = testInput.value.trim();
    if (!text) return;

    evaluateBtn.disabled = true;
    evaluateBtn.textContent = 'Bezig...';
    testResults.innerHTML = '<div class="test-loading">Beoordelen...</div>';

    try {
      if (getMlStatus().status !== 'ready') {
        testResults.innerHTML = '<div class="test-loading">Model laden... (eerste keer: ~120 MB)</div>';
        await loadModel();
      }

      const { rules, ml } = await evaluateBoth(text);
      renderTestResults(rules, ml);
    } catch (err) {
      testResults.innerHTML = `<div class="test-error">Fout: ${escapeHtml(err.message)}</div>`;
    } finally {
      evaluateBtn.disabled = false;
      evaluateBtn.textContent = 'Beoordeel beide aanpakken';
    }
  });

  function renderTestResults(rules, ml) {
    const rulesSignalList = Object.entries(rules.signals || {})
      .map(([k, v]) => `<li>${escapeHtml(k)}: ${escapeHtml(String(v))}</li>`)
      .join('') || '<li>geen triggers</li>';

    let mlHtml;
    if (ml && ml.score != null) {
      const anchorsList = (ml.topAnchors || []).map(a =>
        `<li>${escapeHtml(a.label)} (anker ${a.score}) — sim ${a.sim.toFixed(3)}, gewicht ${(a.weight * 100).toFixed(1)}%</li>`
      ).join('');
      mlHtml = `
        <div class="result-col">
          <h4>ML — score ${ml.score}</h4>
          <p class="muted">Dichtstbijzijnde ankers:</p>
          <ul class="tight-list">${anchorsList}</ul>
        </div>
      `;
    } else {
      const msg = ml && ml.error ? escapeHtml(ml.error) : 'niet beschikbaar';
      mlHtml = `<div class="result-col"><h4>ML</h4><p class="muted">${msg}</p></div>`;
    }

    const diff = (ml && ml.score != null) ? Math.abs(rules.score - ml.score) : null;
    const diffNote = diff != null
      ? `<div class="diff-note ${diff >= 20 ? 'high' : 'low'}">Verschil tussen aanpakken: ${diff} punten</div>`
      : '';

    // Variant-interpretatie: target-zone, in/uit zone, voorspelde reactie
    const variantHtml = renderVariantInterpretation(rules, ml);

    testResults.innerHTML = `
      <div class="results-grid">
        <div class="result-col">
          <h4>Regels — score ${rules.score}</h4>
          <p class="muted">Gedetecteerde signalen:</p>
          <ul class="tight-list">${rulesSignalList}</ul>
        </div>
        ${mlHtml}
      </div>
      ${diffNote}
      ${variantHtml}
    `;
  }

  function renderVariantInterpretation(rules, ml) {
    const variant = getScenario(testVariantId);
    if (!variant) return '';

    const targetLow = variant.targetZone.top;
    const targetHigh = targetLow + variant.targetZone.height;

    // Dezelfde logica als in app.js / scorer.js: in hybride is het
    // gemiddelde van rules + ml, anders een van beide afzonderlijk.
    let combinedScore;
    let scoreSource;
    if (ml && typeof ml.score === 'number') {
      combinedScore = Math.round((rules.score + ml.score) / 2);
      scoreSource = `gemiddelde van regels ${rules.score} + ML ${ml.score}`;
    } else {
      combinedScore = rules.score;
      scoreSource = `alleen rules (${rules.score})`;
    }

    const inZone = scoreInZone(testVariantId, combinedScore);
    const reaction = getReactionForScore(testVariantId, combinedScore);

    const zoneLabel = inZone
      ? `<span class="zone-badge in-zone">in zone</span>`
      : combinedScore < targetLow
        ? `<span class="zone-badge out-zone">te informeel (onder ${targetLow})</span>`
        : `<span class="zone-badge out-zone">te formeel (boven ${targetHigh})</span>`;

    const reactionHtml = reaction
      ? `
        <div class="interp-reaction">
          <div class="interp-face">${FACES[reaction.face] || ''}</div>
          <div class="interp-quote-wrap">
            <div class="interp-face-label">${escapeHtml(FACE_LABELS[reaction.face] || reaction.face)}</div>
            <div class="interp-quote">${escapeHtml(reaction.line)}</div>
          </div>
        </div>
      `
      : '';

    return `
      <div class="variant-interpretation">
        <h4>Interpretatie voor ${escapeHtml(variant.character.name)}</h4>
        <p class="muted" style="margin-bottom: 8px;">
          ${escapeHtml(variant.label)} — sweet spot: <strong>${targetLow}–${targetHigh}</strong>
        </p>
        <div class="interp-row">
          <span class="interp-label">Combined score:</span>
          <span><strong>${combinedScore}</strong> (${escapeHtml(scoreSource)})</span>
        </div>
        <div class="interp-row">
          <span class="interp-label">Ten opzichte van zone:</span>
          ${zoneLabel}
        </div>
        ${reactionHtml}
      </div>
    `;
  }

  // === Logs ===
  const logsEl = document.getElementById('logs');
  subscribeLogs((logs) => {
    if (logs.length === 0) {
      logsEl.innerHTML = '<p class="muted">Nog geen logs</p>';
      return;
    }
    logsEl.innerHTML = logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString('nl-NL');
      const rulesScore = log.rules?.score ?? '—';
      const mlScore = log.ml?.score ?? '—';
      const snippet = log.text.length > 60 ? log.text.substring(0, 60) + '...' : log.text;
      return `
        <div class="log-entry">
          <div class="log-header">
            <span>${time}</span>
            <span>${escapeHtml(log.source)}</span>
          </div>
          <div class="log-scores">R: ${rulesScore} · M: ${mlScore}</div>
          <div class="log-text">${escapeHtml(snippet)}</div>
        </div>
      `;
    }).join('');
  });

  document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
