// Hoofdapplicatie: schermnavigatie, writing scene, reactie, rapport.

import { config } from './engine/config.js';
import { evaluate, evaluateSubject, combinedScore } from './engine/scorer.js';
import { subscribeMl, getMlStatus } from './engine/ml.js';
import { checkGuardrails } from './engine/guardrails.js';
import { SCENARIOS, getScenario, getVariantsForScenario } from './engine/scenarios.js';
import { FACES } from './engine/faces.js';
import { initAdmin } from './admin.js';

/* ============================================================
   Karakter-portretten (SVG templates voor de verschillende
   hoogleraren / docenten in de varianten)
   ============================================================ */
const PORTRAITS = {
  // Prof. dr. Hendriks — formeel, 58 jaar, bril, zijdelings kalend
  hendriks: `<svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="42" r="22" fill="#F4ECE0"/>
    <path d="M20 95 Q20 65 50 65 Q80 65 80 95" fill="#5B6A7B"/>
    <circle cx="42" cy="42" r="2.5" fill="#2A2520"/>
    <circle cx="58" cy="42" r="2.5" fill="#2A2520"/>
    <path d="M42 52 Q50 56 58 52" stroke="#2A2520" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M30 30 Q50 18 70 30 Q70 24 50 22 Q30 24 30 30" fill="#6B5849"/>
    <rect x="35" y="38" width="12" height="6" rx="3" fill="none" stroke="#2A2520" stroke-width="1.2"/>
    <rect x="53" y="38" width="12" height="6" rx="3" fill="none" stroke="#2A2520" stroke-width="1.2"/>
    <line x1="47" y1="41" x2="53" y2="41" stroke="#2A2520" stroke-width="1.2"/>
  </svg>`,

  // Dr. Nadia el-Fassi — informeel, 33 jaar, langer haar, geen bril,
  // warmere huid, groene shirt (verschil met Hendriks-blauw)
  elfassi: `<svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="44" r="22" fill="#E8C9A3"/>
    <path d="M20 95 Q20 66 50 66 Q80 66 80 95" fill="#8BAA7C"/>
    <circle cx="42" cy="44" r="2.5" fill="#2A2520"/>
    <circle cx="58" cy="44" r="2.5" fill="#2A2520"/>
    <path d="M42 54 Q50 58 58 54" stroke="#2A2520" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M25 40 Q22 22 34 16 Q45 10 50 14 Q56 10 68 16 Q78 22 75 40 Q78 52 73 58 L72 42 Q68 26 50 26 Q32 26 28 42 L27 58 Q22 52 25 40" fill="#3A2418"/>
    <circle cx="27" cy="48" r="1.5" fill="#E87B5C"/>
    <circle cx="73" cy="48" r="1.5" fill="#E87B5C"/>
  </svg>`
};

/* ============================================================
   Schermnavigatie
   ============================================================ */
const screens = document.querySelectorAll('.screen');

export function go(name) {
  screens.forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');
  if (name === 'variant-picker') showVariantPicker();
  if (name === 'character')      showCharacter();
  if (name === 'intro')          showIntro();
  if (name === 'write')        { showWrite(); updateMeter(); }
  if (name === 'reaction')       showReaction();
  if (name === 'report')         showReport();
}

document.querySelectorAll('[data-go]').forEach(el => {
  el.addEventListener('click', () => go(el.dataset.go));
});

// Scenario-kaarten op home: zet de actieve scenario-key en navigeer
// naar de variant-picker zodat de student kan kiezen met welke
// ontvanger de scène wordt gedaan.
document.querySelectorAll('[data-scenario]').forEach(el => {
  el.addEventListener('click', () => {
    const scenarioKey = el.dataset.scenario;
    config.set('activeScenarioKey', scenarioKey);
    go('variant-picker');
  });
});

/* ============================================================
   Variant picker — toont alle ontvanger-varianten voor de actieve
   scenario en laat de student kiezen
   ============================================================ */
function showVariantPicker() {
  const scenarioKey = config.get('activeScenarioKey') || 'herkansing';
  const variants = getVariantsForScenario(scenarioKey);
  const listEl = document.getElementById('variantList');
  listEl.innerHTML = '';

  variants.forEach(variant => {
    const card = document.createElement('button');
    card.className = 'variant-card';
    card.innerHTML = `
      <div class="variant-card-portrait">
        ${PORTRAITS[variant.character.portraitKey] || ''}
      </div>
      <div class="variant-card-text">
        <div class="variant-card-label">${escapeHtml(variant.label)}</div>
        <div class="variant-card-name">${escapeHtml(variant.character.name)}</div>
        <div class="variant-card-summary">${escapeHtml(variant.summary)}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      config.set('activeVariant', variant.id);
      go('character');
    });
    listEl.appendChild(card);
  });
}

/* ============================================================
   Character-scherm — rendert op basis van de actieve variant
   ============================================================ */
function getActiveVariant() {
  const id = config.get('activeVariant') || 'herkansing-formeel';
  return getScenario(id) || getScenario('herkansing-formeel');
}

function showCharacter() {
  const v = getActiveVariant();
  document.getElementById('characterPortrait').innerHTML =
    PORTRAITS[v.character.portraitKey] || '';
  document.getElementById('characterName').textContent = v.character.name;
  document.getElementById('characterRole').textContent = v.character.roleLine;

  const tagsEl = document.getElementById('vibeTags');
  tagsEl.innerHTML = '';
  v.character.vibeTags.forEach(tag => {
    const el = document.createElement('span');
    el.className = 'vibe-tag';
    el.textContent = tag;
    tagsEl.appendChild(el);
  });

  document.getElementById('vibeMarker').style.left =
    v.character.vibeMarkerPosition + '%';
  document.getElementById('vibeExplain').innerHTML = v.character.vibeExplain;
  document.getElementById('vibeSubtitle').textContent = v.character.vibeSubtitle;
}

function showIntro() {
  const v = getActiveVariant();
  document.getElementById('introText').innerHTML = v.intro;
}

function showWrite() {
  const v = getActiveVariant();
  document.getElementById('writeContextTo').textContent = v.character.name;

  // Target-zone op de ToonMeter bijstellen op basis van variant
  const zone = document.querySelector('.toonmeter-zone');
  if (zone) {
    zone.style.top = v.targetZone.top + '%';
    zone.style.height = v.targetZone.height + '%';
  }
}

/* ============================================================
   Writing scene
   ============================================================ */
const input        = document.getElementById('emailInput');
const needleRules  = document.getElementById('needleRules');
const needleMl     = document.getElementById('needleMl');
const hintsEl      = document.getElementById('hints');
const mlBadge      = document.getElementById('mlStatusBadge');
const modeInd      = document.getElementById('modeIndicator');
const divergenceEl = document.getElementById('divergence');

const subjectInput     = document.getElementById('subjectInput');
const subjectBandLabel = document.getElementById('subjectBandLabel');
const subjectHintsEl   = document.getElementById('subjectHints');

let lastResult = { mode: 'rules', rules: { score: 50, hints: [], signals: {} }, ml: null, mlPending: false };
let lastSubjectResult = { mode: 'rules', rules: { score: 0, band: 'ontbreekt', hints: [], signals: {} }, ml: null, mlPending: false };

function updateMeter() {
  evaluate(input.value, (result) => {
    lastResult = result;
    renderMeter(result);
  });
}

function renderMeter(result) {
  const mode = result.mode;

  // Mode indicator
  modeInd.textContent = { rules: 'regels', ml: 'ML', hybrid: 'hybride' }[mode];

  // Rules needle
  needleRules.style.top = result.rules.score + '%';
  needleRules.style.display = (mode === 'ml') ? 'none' : 'block';

  // ML needle
  if (mode === 'rules') {
    needleMl.style.display = 'none';
  } else {
    needleMl.style.display = 'block';
    if (result.ml && result.ml.score != null) {
      needleMl.style.top = result.ml.score + '%';
      needleMl.classList.remove('pending');
    } else {
      needleMl.classList.add('pending');
    }
  }

  // ML status badge
  const mlStatus = getMlStatus();
  if (mode === 'rules') {
    mlBadge.style.display = 'none';
  } else {
    mlBadge.style.display = 'block';
    if (mlStatus.status === 'idle') {
      mlBadge.textContent = 'ML: nog niet geladen (ga naar admin om te laden)';
      mlBadge.className = 'ml-status idle';
    } else if (mlStatus.status === 'loading') {
      mlBadge.textContent = `ML: laden ${mlStatus.loadProgress}%`;
      mlBadge.className = 'ml-status loading';
    } else if (mlStatus.status === 'ready') {
      if (result.mlPending) {
        mlBadge.textContent = 'ML: denkt na...';
        mlBadge.className = 'ml-status pending';
      } else {
        mlBadge.textContent = result.ml && result.ml.score != null
          ? `ML: score ${result.ml.score}`
          : 'ML: klaar';
        mlBadge.className = 'ml-status ready';
      }
    } else {
      mlBadge.textContent = 'ML: fout — ' + (mlStatus.errorMessage || 'onbekend');
      mlBadge.className = 'ml-status error';
    }
  }

  // Hints (altijd uit de regels)
  hintsEl.innerHTML = '';
  result.rules.hints.forEach(h => {
    const el = document.createElement('div');
    el.className = 'hint ' + (h.type || '');
    el.textContent = h.text;
    hintsEl.appendChild(el);
  });

  // Divergentie-notitie in hybride modus
  if (mode === 'hybrid' && result.ml && result.ml.score != null) {
    const diff = Math.abs(result.rules.score - result.ml.score);
    if (diff >= 20) {
      divergenceEl.textContent = `De twee aanpakken zien dit verschillend (${diff} punten uit elkaar)`;
      divergenceEl.style.display = 'block';
    } else {
      divergenceEl.style.display = 'none';
    }
  } else {
    divergenceEl.style.display = 'none';
  }
}

input.addEventListener('input', updateMeter);

/* ============================================================
   Subject (onderwerpregel) scoring
   ============================================================ */
function updateSubject() {
  evaluateSubject(subjectInput.value, (result) => {
    lastSubjectResult = result;
    renderSubject(result);
  });
}

function renderSubject(result) {
  const mode = result.mode;
  const rulesBand = result.rules.band;
  const mlBand = result.ml?.band;

  // Leeg veld: verberg feedback
  if (rulesBand === 'ontbreekt') {
    subjectInput.classList.remove('band-zwak', 'band-matig', 'band-goed');
    subjectBandLabel.textContent = '';
    subjectBandLabel.className = 'subject-band-label';
    subjectHintsEl.innerHTML = '';
    return;
  }

  // Input-border kleurt altijd op basis van rules (live, geen wachten)
  subjectInput.classList.remove('band-zwak', 'band-matig', 'band-goed');
  subjectInput.classList.add('band-' + rulesBand);

  // Band-label tekst afhankelijk van modus
  let labelText = '';
  let labelClass = '';
  if (mode === 'rules') {
    labelText = rulesBand;
    labelClass = rulesBand;
  } else if (mode === 'ml') {
    if (result.mlPending) {
      labelText = 'ML…';
      labelClass = 'pending';
    } else if (mlBand) {
      labelText = 'ML: ' + mlBand;
      labelClass = mlBand;
    } else {
      labelText = 'ML: —';
      labelClass = 'pending';
    }
  } else if (mode === 'hybrid') {
    if (result.mlPending) {
      labelText = `${rulesBand} · ML…`;
      labelClass = rulesBand + ' hybrid-split';
    } else if (mlBand) {
      if (mlBand === rulesBand) {
        labelText = rulesBand;
        labelClass = rulesBand;
      } else {
        labelText = `R:${rulesBand} · M:${mlBand}`;
        labelClass = rulesBand + ' hybrid-split';
      }
    } else {
      labelText = rulesBand;
      labelClass = rulesBand;
    }
  }

  subjectBandLabel.textContent = labelText;
  subjectBandLabel.className = 'subject-band-label ' + labelClass;

  // Hints uit rules (altijd zichtbaar)
  subjectHintsEl.innerHTML = '';
  (result.rules.hints || []).forEach(h => {
    const el = document.createElement('div');
    el.className = 'hint ' + (h.type || '');
    el.textContent = h.text;
    subjectHintsEl.appendChild(el);
  });
}

subjectInput.addEventListener('input', updateSubject);

// Herreken bij config-wijziging (modus, debounce, ML-scherpte)
config.subscribe((key) => {
  if (key === 'mode' || key === 'debounceMs' || key === 'softmaxTemperature') {
    updateMeter();
    updateSubject();
  }
});

// Herrender bij ML-statuswijziging
subscribeMl(() => {
  renderMeter(lastResult);
  renderSubject(lastSubjectResult);
});

/* ============================================================
   Guardrail: verstuur-knop vangen
   ============================================================ */
const sendBtn       = document.getElementById('sendBtn');
const guardrailModal   = document.getElementById('guardrailModal');
const guardrailTitle   = document.getElementById('guardrailTitle');
const guardrailMessage = document.getElementById('guardrailMessage');
const guardrailClose   = document.getElementById('guardrailClose');

function showGuardrailModal(issue) {
  guardrailTitle.textContent = issue.title;
  guardrailMessage.textContent = issue.message;
  guardrailModal.classList.add('active');
}

function hideGuardrailModal() {
  guardrailModal.classList.remove('active');
}

guardrailClose.addEventListener('click', hideGuardrailModal);
guardrailModal.addEventListener('click', (e) => {
  // Klik op overlay (niet op de modal zelf) → sluiten
  if (e.target === guardrailModal) hideGuardrailModal();
});

sendBtn.addEventListener('click', () => {
  const issues = checkGuardrails(input.value, lastResult.ml, subjectInput.value);
  if (issues.length > 0) {
    showGuardrailModal(issues[0]);
    return;
  }
  go('reaction');
});

/* ============================================================
   Reactie-scherm
   ============================================================ */
// FACES wordt nu geïmporteerd uit engine/faces.js zodat admin.js
// hetzelfde set kan gebruiken in de test-bench preview.

// Drempel voor "te groot verschil tussen regels en ML om een oordeel
// te kunnen geven" in hybride modus. Onder deze waarde is de uitkomst
// bruikbaar (eventueel met een kleine divergentie-notitie in het
// rapport); boven deze waarde is het gemiddelde niet meer betekenisvol.
const NO_JUDGMENT_DIVERGENCE = 35;

function showReaction() {
  const wrap = document.getElementById('faceWrap');
  const thought = document.getElementById('thought');
  const scoreBadge = document.getElementById('reactionScore');
  const readReportBtn = document.getElementById('readReportBtn');
  const mode = config.get('mode');

  // Case 1: in hybride modus, als regels en ML te ver uit elkaar liggen,
  // geef geen oordeel — de gemiddelde score is dan zinloos en komt vaak
  // door onzin-input of zeer ongebruikelijke tekst.
  if (
    mode === 'hybrid' &&
    lastResult.ml &&
    typeof lastResult.ml.score === 'number'
  ) {
    const diff = Math.abs(lastResult.rules.score - lastResult.ml.score);
    if (diff >= NO_JUDGMENT_DIVERGENCE) {
      wrap.innerHTML = FACES.puzzled;
      thought.textContent =
        'Hmm… met deze inhoud kan ik nog geen oordeel geven. Probeer een e-mail te schrijven die bij de opdracht past.';
      scoreBadge.textContent =
        `Regels en ML zijn het sterk oneens (regels ${lastResult.rules.score} · ML ${lastResult.ml.score} · verschil ${diff}). Dit gebeurt meestal bij onzin of bij tekst die het systeem niet kan plaatsen.`;
      scoreBadge.classList.add('no-judgment');
      if (readReportBtn) readReportBtn.style.display = 'none';
      return;
    }
  }

  // Case 2: normale reactie op basis van score.
  scoreBadge.classList.remove('no-judgment');
  if (readReportBtn) readReportBtn.style.display = '';

  const score = combinedScore(lastResult.rules, lastResult.ml);

  // Variant-specifieke reactie-drempels en -teksten ophalen. Elke
  // variant heeft zijn eigen set, zodat dezelfde score een andere
  // gezichtsuitdrukking kan geven afhankelijk van wie de ontvanger is.
  const variant = getActiveVariant();
  const reaction =
    variant.reactions.find(r => score < r.maxScore) ||
    variant.reactions[variant.reactions.length - 1];

  wrap.innerHTML = FACES[reaction.face];
  thought.textContent = reaction.line;

  if (mode === 'rules') {
    scoreBadge.textContent = `Score: ${lastResult.rules.score} (regels)`;
  } else if (mode === 'ml') {
    const mlScore = lastResult.ml?.score ?? '—';
    scoreBadge.textContent = `Score: ${mlScore} (ML)`;
  } else if (mode === 'hybrid' && lastResult.ml && lastResult.ml.score != null) {
    scoreBadge.textContent = `Score: ${score} — gemiddelde van regels ${lastResult.rules.score} + ML ${lastResult.ml.score}`;
  } else {
    scoreBadge.textContent = `Score: ${score}`;
  }
}

/* ============================================================
   Rapport-scherm
   ============================================================ */
function showReport() {
  const text = input.value.trim() || '(je hebt nog niets geschreven)';
  document.getElementById('reportEmail').textContent = text;
  document.getElementById('compareYou').innerHTML =
    '<strong>Jouw versie</strong>' + escapeHtml(text);

  // Onderwerpregel in het rapport
  const subjectText = subjectInput.value.trim() || '(geen onderwerpregel)';
  const subjectBandEl = document.getElementById('reportSubjectBand');
  document.getElementById('reportSubject').textContent = subjectText;
  const subjectBand = lastSubjectResult.rules?.band;
  if (subjectBand && subjectBand !== 'ontbreekt') {
    subjectBandEl.textContent = subjectBand;
    subjectBandEl.className = 'report-subject-band ' + subjectBand;
  } else {
    subjectBandEl.textContent = '—';
    subjectBandEl.className = 'report-subject-band';
  }

  const score = combinedScore(lastResult.rules, lastResult.ml);
  const notes = [];

  // Variant-context voor alle observaties in het rapport
  const variant = getActiveVariant();
  const isFormalVariant = variant.targetZone.top >= 60;
  const recipientName = variant.character.name;
  const sweetLow = variant.targetZone.top;
  const sweetHigh = sweetLow + variant.targetZone.height;

  // Opmerking over de onderwerpregel
  if (subjectBand === 'goed') {
    notes.push('Je onderwerpregel was concreet en duidelijk — dat vergroot de kans dat je e-mail snel wordt gelezen en goed geprioriteerd.');
  } else if (subjectBand === 'matig') {
    notes.push('Je onderwerpregel is op zich duidelijk, maar kan nog specifieker. Een concrete beschrijving ("herkansing tentamen Cultuurgeschiedenis") helpt de ontvanger direct te plaatsen waar het over gaat.');
  } else if (subjectBand === 'zwak') {
    notes.push('Je onderwerpregel was vaag of ongepast. In een drukke inbox bepaalt de onderwerpregel vaak of een e-mail direct wordt gelezen of blijft liggen.');
  }

  // Aanhef — variant-aware
  if (/\b(geachte|hooggeachte)\b/i.test(text)) {
    if (isFormalVariant) {
      notes.push(`Je opende met een formele aanhef — die past bij ${recipientName}.`);
    } else {
      notes.push(`Je opende met "Geachte". Voor ${recipientName} is dat waarschijnlijk te stijf — zij verwacht geen brief-toon.`);
    }
  } else if (/\b(hey+|hoi+|yo+)\b/i.test(text)) {
    if (isFormalVariant) {
      notes.push(`Je opening was vriendelijk-direct. Voor ${recipientName} voelt dat waarschijnlijk te los.`);
    } else {
      notes.push(`Je opening was vriendelijk-direct. Voor ${recipientName} past dat prima — mits de rest van de e-mail duidelijk is.`);
    }
  } else if (/\bbeste\b/i.test(text)) {
    notes.push('Je opende met "Beste" — dat is neutraal-vriendelijk en werkt in bijna elke context.');
  } else {
    notes.push(`Je hebt geen duidelijke aanhef — bij een ontvanger zoals ${recipientName} mist die soms de toon.`);
  }

  const u  = (text.match(/\b(u|uw)\b/gi) || []).length;
  const je = (text.match(/\b(je|jij|jou|jouw)\b/gi) || []).length;
  if (u > 0 && je === 0) {
    if (isFormalVariant) {
      notes.push(`Je gebruikte consequent "u" — dat geeft passende afstand bij ${recipientName}.`);
    } else {
      notes.push(`Je gebruikte consequent "u". Voor ${recipientName} kan dat formeler aanvoelen dan nodig — ze is benaderbaar.`);
    }
  } else if (je > 0 && u === 0) {
    if (isFormalVariant) {
      notes.push(`Je sprak ${recipientName} aan met "je" — direct en informeel. Voor deze ontvanger voelt dat vaak te dichtbij.`);
    } else {
      notes.push(`Je sprak ${recipientName} aan met "je" — dat past bij haar informele stijl.`);
    }
  } else if (je > 0 && u > 0) {
    notes.push('Je wisselde tussen "u" en "je" — dat geeft vaak een onbedoeld haperend ritme.');
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 25) {
    if (isFormalVariant) {
      notes.push('Je e-mail is kort. In een formele context laat extra context (waarom, wanneer) vaak juist serieusheid zien.');
    } else {
      notes.push('Je e-mail is kort — voor een informele ontvanger kan dat juist goed werken, zolang de kern duidelijk is.');
    }
  } else if (wordCount > 80) {
    notes.push('Je e-mail is uitgebreid. Bij een drukke ontvanger kan kernachtig formuleren respectvoller voelen.');
  }

  // Algemene toon-beoordeling op basis van de target-zone van de variant
  if (score < sweetLow - 20) {
    notes.push(`Algemene toon: te informeel voor ${recipientName}. De meter staat ver van de sweet spot.`);
  } else if (score > sweetHigh + 10) {
    if (isFormalVariant) {
      notes.push('Algemene toon: zeer formeel — overdreven kan ook afstand creëren.');
    } else {
      notes.push(`Algemene toon: te formeel voor ${recipientName} — dat voelt bij haar al snel geforceerd.`);
    }
  } else if (score >= sweetLow && score <= sweetHigh) {
    notes.push(`Algemene toon: goed gekalibreerd voor ${recipientName}.`);
  } else {
    notes.push('Algemene toon: in de buurt van de sweet spot, maar niet helemaal binnen.');
  }

  // Modus-specifieke notitie
  const mode = config.get('mode');
  if (mode === 'hybrid' && lastResult.ml && lastResult.ml.score != null) {
    const diff = Math.abs(lastResult.rules.score - lastResult.ml.score);
    if (diff >= 15) {
      notes.push(`Regels en ML zagen dit verschillend: regels ${lastResult.rules.score}, ML ${lastResult.ml.score}.`);
    } else {
      notes.push(`Regels (${lastResult.rules.score}) en ML (${lastResult.ml.score}) zijn het grotendeels eens.`);
    }
  }

  document.getElementById('reportNotes').innerHTML =
    notes.map(n => `<p style="margin-bottom:10px;">${escapeHtml(n)}</p>`).join('');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ============================================================
   Init
   ============================================================ */
// Render alvast de schermen die variant-data nodig hebben, zodat er
// geen lege placeholders staan als de gebruiker iets anders doet dan
// de normale flow (bv. browser-reload op een ander scherm).
showCharacter();
showIntro();
showWrite();
updateMeter();
updateSubject();
initAdmin();
