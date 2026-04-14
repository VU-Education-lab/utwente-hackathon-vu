// Scenario-varianten voor "Herkansing aanvragen".
//
// Twee varianten, zelfde situatie (zieke oma, tentamen morgen), andere
// ontvanger — en daardoor een andere passende toon. De student ervaart
// zo dat register geen vaste regel is maar meebeweegt met wie er aan
// de andere kant zit.
//
// === Belangrijke ontwerpkeuze ===
//
// De ML-ankers (in anchors.js) blijven gelijk voor beide varianten.
// Die meten de universele formaliteitsdimensie (0 = informeel, 100 =
// formeel). Wat per variant verandert is:
//   1. De target-zone op de ToonMeter (waar de "sweet spot" zit)
//   2. De drempels voor de ontvanger-reactie (wanneer welk gezicht)
//   3. De karakterkaart, story-intro en schrijfcontext
//
// Zo blijven de anker-zinnen beheersbaar en voelt de student toch
// concreet dat het register moet meebewegen.

export const SCENARIOS = {
  'herkansing-formeel': {
    id: 'herkansing-formeel',
    scenarioKey: 'herkansing',
    label: 'Formele hoogleraar',
    summary: 'Hij leest zorgvuldig en let op vorm.',

    character: {
      name: 'Prof. dr. Hendriks',
      roleLine: 'Hoogleraar Geschiedenis · 58 jaar',
      portraitKey: 'hendriks',
      vibeTags: ['precies', 'druk', 'formeel-binnen-grenzen'],
      vibeMarkerPosition: 72,
      vibeExplain: 'De donkere stip is zijn <strong>sweet spot</strong> — niet te los, niet te stijf. Probeer straks aan te voelen of je e-mail daar in de buurt landt.',
      vibeSubtitle: 'een gevoelskwestie, geen rekensom'
    },

    intro: `Het is <strong>donderdagavond</strong>. Morgen om negen uur is je tentamen
Cultuurgeschiedenis — maar je oma is plotseling opgenomen in het ziekenhuis
en je staat op het station, klaar om de trein te pakken.
<br><br>
Je kunt morgen <strong>niet</strong> komen opdagen. Je moet prof. Hendriks
een mail sturen om een herkansing aan te vragen.
<br><br>
Je weet: hij staat bekend als precies, en hij krijgt elke dag tientallen
mailtjes van studenten.`,

    emailTo: 'Prof. dr. Hendriks',

    // ToonMeter target-zone: scores 60-85 (formeel maar niet overdreven)
    targetZone: { top: 60, height: 25 },

    // Reactie-drempels: `maxScore` is exclusief (score < maxScore → match).
    // Laatste entry vangt alles tot 100 op (gebruik 101 om ook 100 te matchen).
    reactions: [
      { maxScore: 35,  face: 'frown',   line: '"...is dit een appje?"' },
      { maxScore: 60,  face: 'puzzled', line: '"Hmm, wat informeel voor zo\'n verzoek..."' },
      { maxScore: 86,  face: 'pleased', line: '"Helder en respectvol — dank je."' },
      { maxScore: 101, face: 'amused',  line: '"Wat formeel zeg... ik ben geen koning."' }
    ]
  },

  'herkansing-informeel': {
    id: 'herkansing-informeel',
    scenarioKey: 'herkansing',
    label: 'Informele docent',
    summary: 'Je kent haar van de werkgroep. Benaderbaar en recht-door-zee.',

    character: {
      name: 'Dr. Nadia el-Fassi',
      roleLine: 'Docent Cultuurgeschiedenis · 33 jaar',
      portraitKey: 'elfassi',
      vibeTags: ['benaderbaar', 'direct', 'professioneel-informeel'],
      vibeMarkerPosition: 40,
      vibeExplain: 'Nadia verwacht geen stijve taal, maar ook geen appje. De donkere stip is haar <strong>sweet spot</strong>: ontspannen maar zakelijk genoeg om serieus te worden genomen.',
      vibeSubtitle: 'ze is benaderbaar, niet je vriendin'
    },

    intro: `Het is <strong>donderdagavond</strong>. Morgen om negen uur heb je tentamen
Cultuurgeschiedenis bij Nadia — de docent die je dit semester twee
werkgroepen van hebt gehad.
<br><br>
Maar je oma is plotseling opgenomen in het ziekenhuis en je staat op het
station, klaar om de trein te pakken. Je kunt morgen <strong>niet</strong>
komen opdagen.
<br><br>
Je kent Nadia: benaderbaar, recht-door-zee. Ze spreekt studenten aan met
hun voornaam en mailt terug met "hi!". Maar ze is wel je docent — niet
je vriendin.`,

    emailTo: 'Dr. Nadia el-Fassi',

    // Target-zone opgeschoven: scores 35-65 (informeel-neutraal met nog
    // steeds wat professionele afstand)
    targetZone: { top: 35, height: 30 },

    // Reactie-drempels: informele docent reageert juist vreemd op té
    // formeel en waardeert een ontspannen maar duidelijke toon.
    reactions: [
      { maxScore: 15,  face: 'puzzled', line: '"Is dit wel voor mij? Zo wordt er niet vaak aan me geschreven..."' },
      { maxScore: 35,  face: 'pleased', line: '"Helder. Komt goed."' },
      { maxScore: 66,  face: 'pleased', line: '"Fijn dat je het even laat weten. Sterkte met je oma."' },
      { maxScore: 86,  face: 'amused',  line: '"Best formeel voor mijn doen… maar wel netjes hoor."' },
      { maxScore: 101, face: 'amused',  line: '"Eh, wat? Je hoeft me niet aan te spreken als een rechter."' }
    ]
  }
};

export function getScenario(id) {
  return SCENARIOS[id];
}

export function getVariantsForScenario(scenarioKey) {
  return Object.values(SCENARIOS).filter(s => s.scenarioKey === scenarioKey);
}

// Geeft alle unieke scenario-keys terug (handig voor de admin
// scenario-dropdown wanneer er meer scenario's bij komen).
export function getAllScenarioKeys() {
  const keys = new Set();
  Object.values(SCENARIOS).forEach(v => keys.add(v.scenarioKey));
  return Array.from(keys);
}

// Vindt de reactie-entry voor een gegeven score binnen een variant.
// Wordt gebruikt door zowel de live reactie-scène (app.js) als door
// de admin test-bench (admin.js) om een voorspelling te tonen.
export function getReactionForScore(variantId, score) {
  const v = getScenario(variantId);
  if (!v || !v.reactions) return null;
  return (
    v.reactions.find(r => score < r.maxScore) ||
    v.reactions[v.reactions.length - 1]
  );
}

// Bepaalt of een score binnen de target-zone van een variant valt.
export function scoreInZone(variantId, score) {
  const v = getScenario(variantId);
  if (!v || !v.targetZone) return false;
  const low = v.targetZone.top;
  const high = low + v.targetZone.height;
  return score >= low && score <= high;
}
