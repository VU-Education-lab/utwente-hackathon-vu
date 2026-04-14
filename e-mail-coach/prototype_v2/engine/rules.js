// Regelgebaseerde scorers voor body en onderwerpregel.
// - evaluateRules(text) → formaliteit (0-100) voor de body
// - evaluateSubjectRules(text) → kwaliteit (0-100) voor de subject

// ============================================================
// SUBJECT — kwaliteit van de onderwerpregel
// ============================================================

export function evaluateSubjectRules(text) {
  const trimmed = (text || '').trim();

  if (!trimmed) {
    return {
      score: 0,
      band: 'ontbreekt',
      hints: [{ text: 'Onderwerpregel ontbreekt', type: 'warm' }],
      signals: { empty: true }
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const signals = { woordenAantal: words.length };
  const hints = [];
  let score = 50;

  // Lengte
  if (words.length < 2) {
    score -= 30;
    hints.push({ text: 'Te kort — voeg context toe', type: 'warm' });
    signals.teKort = true;
  } else if (words.length > 10) {
    score -= 15;
    hints.push({ text: 'Te lang — onderwerp mag compact', type: 'warm' });
    signals.teLang = true;
  } else if (words.length >= 4 && words.length <= 8) {
    score += 8;
    signals.goedeLengte = true;
  }

  // Vage eenwoord-onderwerpen
  if (/^(vraag|hallo|hoi|hey|help|hulp|tentamen|mail|urgent|belangrijk)\s*\??\s*$/i.test(trimmed)) {
    score -= 30;
    hints.push({ text: 'Te vaag — wees specifieker', type: 'warm' });
    signals.vaag = true;
  }

  // Informele groet als onderwerp
  if (/\b(hey|yo|hoi|hallo)\b/i.test(trimmed) && words.length <= 4) {
    score -= 15;
    hints.push({ text: 'Onderwerp is geen begroeting', type: 'warm' });
    signals.begroetingAlsOnderwerp = true;
  }

  // Scenario-zoekwoorden (concreet en relevant)
  const hasTopicKey = /\b(tentamen|herkansing|herkansen|cultuurgeschied|examen|afwezig|aanwezig)/i.test(trimmed);
  if (hasTopicKey) {
    score += 20;
    hints.push({ text: 'Concreet — dit helpt de ontvanger', type: 'cool' });
    signals.scenarioKeyword = true;
  }

  // Emoji's
  if (/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u.test(trimmed)) {
    score -= 25;
    hints.push({ text: 'Geen emoji in onderwerp', type: 'warm' });
    signals.emoji = true;
  }

  // Meerdere uitroep/vraagtekens
  if (/[!?]{2,}/.test(trimmed)) {
    score -= 15;
    hints.push({ text: 'Rustig met uitroeptekens', type: 'warm' });
    signals.meerdereUitroep = true;
  }

  // Alles kleine letters
  if (trimmed === trimmed.toLowerCase() && /[a-z]/.test(trimmed)) {
    score -= 10;
    hints.push({ text: 'Begin met een hoofdletter', type: 'warm' });
    signals.geenHoofdletter = true;
  }

  // Alles hoofdletters (schreeuwen)
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 4 && /[A-Z]/.test(trimmed)) {
    score -= 20;
    hints.push({ text: 'Niet in hoofdletters schreeuwen', type: 'warm' });
    signals.alleHoofdletters = true;
  }

  score = Math.max(0, Math.min(100, score));

  let band;
  if (score < 35)      band = 'zwak';
  else if (score < 65) band = 'matig';
  else                 band = 'goed';

  return {
    score,
    band,
    hints: hints.slice(0, 2),
    signals
  };
}

// ============================================================
// BODY — formaliteit van de e-mail zelf
// ============================================================

export function evaluateRules(text) {
  if (!text.trim()) {
    return { score: 50, hints: [], signals: {} };
  }

  let score = 50;
  const hints = [];
  const signals = {};

  // ---- Hints zijn bewust NEUTRAAL beschrijvend ----
  //
  // De hints vertellen WAT er gedetecteerd is, niet of dat goed of
  // slecht is. Het oordeel (past dit bij de ontvanger?) komt uit de
  // positie van de naald op de ToonMeter ten opzichte van de
  // target-zone, die per scenario-variant verschilt. Zo kunnen
  // dezelfde hints gelden voor zowel de formele als de informele
  // variant zonder misleidende context-specifieke taal.

  // Informele aanhef
  if (/\b(hey+|hoi+|yo+|hee+y?|hai+)\b/i.test(text)) {
    score -= 25;
    hints.push({ text: '"Hey/Hoi" — informele aanhef', type: 'warm' });
    signals.informeleAanhef = true;
  }
  if (/\bbeste\b/i.test(text)) {
    score += 5;
    hints.push({ text: '"Beste" — neutraal-vriendelijk', type: '' });
    signals.neutraleAanhef = true;
  }
  if (/\b(geachte|hooggeachte)\b/i.test(text)) {
    score += 25;
    hints.push({ text: '"Geachte" — formele aanhef', type: 'cool' });
    signals.formeleAanhef = true;
  }

  // Aanspreekvormen
  const uMatches = (text.match(/\b(u|uw)\b/gi) || []).length;
  const jeMatches = (text.match(/\b(je|jij|jou|jouw)\b/gi) || []).length;
  if (uMatches > 0 && uMatches >= jeMatches) {
    score += 15;
    hints.push({ text: 'aanspreekvorm "u" — formeel', type: 'cool' });
    signals.uVorm = uMatches;
  }
  if (jeMatches > uMatches && jeMatches > 0) {
    score -= 15;
    hints.push({ text: 'aanspreekvorm "je" — informeel', type: 'warm' });
    signals.jeVorm = jeMatches;
  }

  // Afsluitingen
  if (/\b(hoogachtend|met vriendelijke groet|mvg)\b/i.test(text)) {
    score += 15;
    hints.push({ text: 'formele afsluiting', type: 'cool' });
    signals.formeleAfsluiting = true;
  }
  if (/\b(groetjes|cheers|byee+|doei|xxx|x{2,})\b/i.test(text)) {
    score -= 20;
    hints.push({ text: 'informele afsluiting', type: 'warm' });
    signals.informeleAfsluiting = true;
  }

  // Emoji's
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu) || []).length;
  if (emojiCount > 0) {
    score -= emojiCount * 12;
    hints.push({ text: 'emoji gedetecteerd', type: 'warm' });
    signals.emojis = emojiCount;
  }

  // Meerdere uitroeptekens
  if (/[!?]{2,}/.test(text)) {
    score -= 10;
    hints.push({ text: 'meerdere uitroeptekens', type: 'warm' });
    signals.meerdereUitroep = true;
  }

  // Spreektaal / vulwoorden
  const slangCount = (text.match(/\b(btw|ff|ofzo|lol|xd|haha+|gewoon|echt|zegmaar|sowieso|whatever)\b/gi) || []).length;
  if (slangCount > 0) {
    score -= slangCount * 6;
    hints.push({ text: 'spreektaal', type: 'warm' });
    signals.spreektaal = slangCount;
  }

  // Hoofdlettergebruik
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length > 1) {
    const noCap = sentences.filter(s => /^[a-z]/.test(s.trim())).length;
    if (noCap / sentences.length > 0.3) {
      score -= 8;
      hints.push({ text: 'weinig hoofdletters', type: 'warm' });
      signals.weinigHoofdletters = true;
    }
  }

  // Lengte
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 12) {
    score -= 4;
  } else if (wordCount > 35) {
    score += 4;
  }
  signals.woordenAantal = wordCount;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    hints: hints.slice(0, 3),
    signals
  };
}
