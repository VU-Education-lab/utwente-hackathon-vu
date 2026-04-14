// Anker-zinnen voor het hoogleraar/herkansing scenario.
// Elk anker is een representatieve tekst op een bekende positie op de
// formaliteitsschaal (0 = zeer informeel, 100 = zeer formeel).
//
// Bij classificatie wordt de invoer van de student vergeleken met al
// deze ankers via cosinus-gelijkenis op de embeddings. De score is een
// gewogen gemiddelde van de anker-scores, waar de gewichten komen uit
// een softmax over de similarities.
//
// Tuning-tips:
//   - Ankers mogen qua inhoud op elkaar lijken, maar moeten in
//     register duidelijk verschillen.
//   - Hou de lengte enigszins vergelijkbaar — te korte ankers kunnen
//     kunstmatig hoog scoren op irrelevante zinnen.
//   - Voeg ankers toe als je een bepaald register onvoldoende vindt
//     afgedekt (bv. "formeel maar warm").

// ============================================================
// SUBJECT ANCHORS — voor onderwerpregels
// ============================================================
// Apart anker-set omdat onderwerpregels een andere dimensie meten dan
// de body: informativiteit/gepastheid, niet formaliteit. Score 0-100
// met drie banden: zwak (<35), matig (35-64), goed (≥65).
//
// Het e5-model is minder stabiel op zeer korte tekst (2-5 woorden), dus
// reken op meer ruis hier dan bij de body-ankers. Contrastieve centrering
// helpt wel: het onderwerp-centroid weerspiegelt "gemiddelde
// herkansing-related string" en aftrekken daarvan laat kwaliteitsverschil
// beter zien.

export const SUBJECT_ANCHORS = [
  {
    score: 10,
    label: "zwak — te vaag",
    text: "Vraag"
  },
  {
    score: 15,
    label: "zwak — informele begroeting",
    text: "hey prof help"
  },
  {
    score: 25,
    label: "zwak — een woord",
    text: "Tentamen"
  },
  {
    score: 50,
    label: "matig — algemeen",
    text: "Afwezigheid tentamen"
  },
  {
    score: 55,
    label: "matig — niet specifiek",
    text: "Herkansing aanvragen"
  },
  {
    score: 80,
    label: "goed — specifiek onderwerp",
    text: "Verzoek herkansing tentamen Cultuurgeschiedenis"
  },
  {
    score: 85,
    label: "goed — onderwerp met reden",
    text: "Herkansing Cultuurgeschiedenis — familieomstandigheden"
  },
  {
    score: 88,
    label: "goed — volledige context",
    text: "Afwezigheid tentamen Cultuurgeschiedenis 14 december"
  }
];

// ============================================================
// BODY ANCHORS — voor de e-mail zelf
// ============================================================

export const ANCHORS = [
  {
    score: 95,
    label: "zeer formeel (overdreven)",
    text: "Hooggeachte heer professor Hendriks, met de meeste hoogachting richt ik mij tot u met het verzoek of u welwillend zou willen overwegen mij een mogelijkheid tot herkansing te verlenen voor het aanstaande tentamen Cultuurgeschiedenis. Een familiale omstandigheid van ernstige aard maakt mijn aanwezigheid morgen onmogelijk. Met de meeste hoogachting verblijf ik, uw dienstwillige dienaar."
  },
  {
    score: 78,
    label: "formeel (gekalibreerd)",
    text: "Geachte heer Hendriks, hierbij verzoek ik u vriendelijk om een herkansing voor het tentamen Cultuurgeschiedenis dat morgen plaatsvindt. Mijn grootmoeder is gisteren plotseling opgenomen in het ziekenhuis, en ik kan daardoor helaas niet aanwezig zijn. Ik hoop dat u begrip heeft voor deze situatie en verneem graag of een herkansing mogelijk is. Met vriendelijke groet, Sanne de Vries."
  },
  {
    score: 60,
    label: "neutraal-beleefd",
    text: "Beste meneer Hendriks, ik schrijf u omdat ik morgen helaas niet bij het tentamen Cultuurgeschiedenis aanwezig kan zijn. Mijn oma is gisteren opgenomen in het ziekenhuis en ik moet naar haar toe. Zou het mogelijk zijn om later een herkansing te maken? Alvast bedankt voor uw begrip. Met vriendelijke groet, Sanne."
  },
  {
    score: 40,
    label: "informeel-net",
    text: "Hallo meneer Hendriks, ik kan morgen helaas niet naar het tentamen komen omdat mijn oma in het ziekenhuis is opgenomen. Ik moet naar haar toe. Is het mogelijk om later een herkansing te maken? Ik hoop dat het lukt. Bedankt alvast, groeten, Sanne."
  },
  {
    score: 20,
    label: "informeel (te los)",
    text: "Hoi prof, ik kan morgen niet bij het tentamen zijn, mijn oma ligt in het ziekenhuis en ik moet naar haar toe. Kan ik een herkansing doen ofzo? Laat maar weten. Groetjes, Sanne."
  },
  {
    score: 5,
    label: "zeer informeel",
    text: "yo prof ff een vraagje kan ik morgen niet komen voor het tentamen want mn oma ligt in het ziekenhuis is een herkansing mogelijk ofzo?? groetjes"
  }
];
