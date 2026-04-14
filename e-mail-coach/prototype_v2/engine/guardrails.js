// Guardrails.
//
// Een laag die detecteert of de invoer van de student serieus is en
// over de opdracht gaat. Triggert bij het klikken op "Verstuur" en
// blokkeert de voortgang als er iets niet klopt — met een vriendelijke
// toelichting die de student aanspoort om de opdracht écht uit te
// voeren in plaats van het systeem te testen.
//
// Vier categorieën:
//   1. Gibberish       — te kort of duidelijk geen e-mail
//   2. Beledigingen    — scheldwoorden richting ontvanger
//   3. Meta / testen   — pogingen om het systeem te "testen"
//   4. Off-topic       — gaat niet over de opdracht (rules + ML)

// ---- 1. Beledigingspatronen ----
// Hou dit bewust kort en Nederlandstalig. Woordenboek kan groeien als
// je in de praktijk ziet welke woorden door studenten worden gebruikt.
const INSULT_PATTERNS = [
  /\b(klootzak|klotzak|idioot|sukkel|eikel|rotzak|debiel|achterlijk|hufter|mongool|kankerlijer|kkr)\b/i,
  /\b(stomme?|domme?|saaie?|ouwe?|vieze?)\s+(hoogleraar|prof(essor)?|docent|leraar|man|vent|kerel|ouwe|zak)\b/i,
  /\b(je moeder|je pa|fuck (you|u|jou)|rot op|val dood)\b/i,
];

// ---- 2. Meta / testpatronen ----
const META_PATTERNS = [
  /\b(ignore (previous|all|the) (instructions|rules|prompts?))\b/i,
  /\b(this is (a|just a) test|dit is (een|maar een) test)\b/i,
  /\b(jailbreak|bypass (the )?(system|ai)|system prompt)\b/i,
  /\b(ik test|even testen|testen of|kan je wel)\b/i,
  /^(test\s*)+$/i,
  /^(asdf|qwerty|1234|abcd|lorem ipsum|hallo wereld)/i,
  /^(.)\1{4,}$/i,   // herhaalde karakters zoals "aaaaa"
];

// ---- 3. Scenario-zoekwoorden ----
// Minstens één moet voorkomen in een e-mail van 20+ woorden, anders
// is hij waarschijnlijk off-topic. Bewust ruim genomen zodat een
// student die creatief formuleert niet onterecht wordt geblokkeerd.
const SCENARIO_KEYWORDS = /\b(hendriks|prof(essor)?|hoogleraar|docent|tentamen|herkansing|herkansen|examen|college|cultuurgeschied|ziek|ziekenhuis|opgenomen|oma|grootmoeder|familie|afwezig|aanwezig|morgen|niet komen|kan niet|verhind)/i;

// ---- 4. ML-similariteitsdrempel ----
// De maximale ruwe cosinus-gelijkenis met de ankers in de ongecenterde
// ruimte. Onder deze waarde is de tekst waarschijnlijk geen variatie
// op het scenario-onderwerp.
const ML_OFFTOPIC_THRESHOLD = 0.78;

/**
 * Controleer de invoer op guardrail-overtredingen.
 *
 * @param {string} text - wat de student heeft geschreven (body)
 * @param {object|null} mlResult - optioneel het laatste ML-resultaat
 *                                 voor de body, met een veld `maxRawSim`
 * @param {string|null} subject - optioneel de onderwerpregel
 * @returns {Array<{type, title, message}>} lege array als alles OK is
 */
export function checkGuardrails(text, mlResult = null, subject = null) {
  // 0. Lege onderwerpregel (alleen als we een subject meegekregen hebben)
  if (subject !== null && !subject.trim()) {
    return [{
      type: 'no-subject',
      title: 'Onderwerpregel ontbreekt',
      message: 'Een e-mail zonder onderwerpregel wordt vaak overgeslagen of slecht geprioriteerd. Bedenk een korte, duidelijke onderwerpregel die vertelt waar je e-mail over gaat — bijvoorbeeld "Verzoek herkansing tentamen Cultuurgeschiedenis".'
    }];
  }

  const trimmed = text.trim();

  // Bijna niks geschreven — laat door (er is geen e-mail om te
  // versturen; de normale ervaring vangt dit wel op)
  if (trimmed.length < 5) return [];

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // 1. Gibberish
  if (wordCount < 3 && trimmed.length < 25) {
    return [{
      type: 'gibberish',
      title: 'Dit lijkt nog geen e-mail',
      message: 'Schrijf een echte e-mail aan prof. Hendriks. Begin bijvoorbeeld met een aanhef en leg uit waarom je morgen niet op het tentamen kunt zijn.'
    }];
  }

  // 2. Beledigingen
  for (const pattern of INSULT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return [{
        type: 'insult',
        title: 'Hou het respectvol',
        message: 'Deze oefening gaat over het leren schrijven van e-mails die de ontvanger serieus neemt. Ook als je het ergens niet mee eens bent, of gefrustreerd bent, hoort een e-mail aan een hoogleraar netjes te blijven. Probeer opnieuw.'
      }];
    }
  }

  // 3. Meta / testen
  for (const pattern of META_PATTERNS) {
    if (pattern.test(trimmed)) {
      return [{
        type: 'meta',
        title: 'Dit is geen test-omgeving',
        message: 'Probeer de opdracht echt uit te voeren: schrijf een e-mail aan prof. Hendriks om een herkansing aan te vragen, omdat je oma in het ziekenhuis is opgenomen en je morgen niet op het tentamen kunt zijn.'
      }];
    }
  }

  // 4a. Off-topic — regel-gebaseerde keyword check
  //     Alleen bij e-mails van ≥20 woorden, om korte starters ruimte
  //     te geven zonder direct te blokkeren.
  if (wordCount >= 20 && !SCENARIO_KEYWORDS.test(trimmed)) {
    return [{
      type: 'offtopic',
      title: 'Dit lijkt niet over de opdracht te gaan',
      message: 'De oefening is: schrijf een e-mail aan prof. Hendriks om een herkansing aan te vragen voor het tentamen Cultuurgeschiedenis van morgen, omdat je oma in het ziekenhuis is opgenomen. Probeer opnieuw met die situatie voor ogen.'
    }];
  }

  // 4b. Off-topic — ML-gebaseerde similariteit
  //     Alleen gebruiken als ML beschikbaar was en de e-mail lang
  //     genoeg is om een stabiele embedding te hebben.
  if (
    mlResult &&
    typeof mlResult.maxRawSim === 'number' &&
    wordCount >= 15 &&
    mlResult.maxRawSim < ML_OFFTOPIC_THRESHOLD
  ) {
    return [{
      type: 'offtopic-ml',
      title: 'Dit lijkt niet over de opdracht te gaan',
      message: 'Wat je hebt geschreven ligt ver af van wat de opdracht vraagt. Schrijf een e-mail aan prof. Hendriks over het aanvragen van een herkansing. Probeer het opnieuw.'
    }];
  }

  return [];
}
