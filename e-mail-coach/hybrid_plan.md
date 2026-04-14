# Architectuur: hybride scoring met Transformers.js

Beschrijft hoe de twee scoring-lagen (regels + ML) in de prototype
samenwerken. Oorspronkelijk geschreven als implementatieplan, nu
herschreven als overzicht van wat er staat en waarom.

---

## 1. Waarom twee lagen?

**Regels** zijn snel, gratis, uitlegbaar, maar missen nuance. Ze
reageren op oppervlakte-signalen (woorden, leestekens, hoofdletters)
en zijn blind voor subtielere registerverschillen.

**ML** (via een lokaal embedding-model) vangt meer nuance op, maar is
trager, heeft een eenmalige download van ~120 MB nodig, en kan niet
op elke toetsaanslag draaien.

De hybride aanpak combineert ze: regels voor de live ToonMeter
(elke toets, 0 ms latency), ML als tweede mening die debounced
draait (~800 ms na laatste toetsaanslag).

Daarnaast is er een **admin-pagina** waar je tussen drie modi kunt
schakelen — rules-only, ML-only, hybride — om ze naast elkaar te
kunnen vergelijken tijdens ontwerp en tuning.

---

## 2. De drie modi

| Modus          | Wat draait               | Snelheid           | Waar goed voor                      |
| -------------- | ------------------------ | ------------------ | ----------------------------------- |
| **Rules-only** | Alleen regelgebaseerd    | Live, elke toets   | Baseline, snelst, geen model nodig  |
| **ML-only**    | Alleen Transformers.js   | ~200-500ms vertraging | Hoe voelt de pure ML-aanpak?         |
| **Hybride**    | Beide, beide zichtbaar   | Beide              | Vergelijken, intuïtie opbouwen      |

In hybride modus is de rules-naald primair (ademend, live). De ML-
naald verschijnt als gestreepte cirkel en update gedebounced. Bij
het versturen is de gebruikte score het **gemiddelde** van de twee.

De keuze wordt opgeslagen in localStorage via [`config.js`](prototype_v2/engine/config.js)
en persisteert tussen sessies.

---

## 3. ML-aanpak: embeddings + contrastieve ankers

Er is geen fine-tuning, geen generatieve LLM, geen API-calls. We
gebruiken `Xenova/multilingual-e5-small` (~120 MB) als
embedding-extractor en vergelijken met anker-zinnen.

### Anker-zinnen

In [`engine/anchors.js`](prototype_v2/engine/anchors.js) staan zes
anker-zinnen, elk met een vaste score op de formaliteitsschaal:

```
95 — zeer formeel (overdreven)
78 — formeel (gekalibreerd)
60 — neutraal-beleefd
40 — informeel-net
20 — informeel (te los)
 5 — zeer informeel
```

Alle zes gaan over hetzelfde scenario-onderwerp (herkansing, zieke
oma, tentamen) zodat onderwerp-verschillen geen ruis zijn.

### Bij het laden van het model

1. Elke ankerzin wordt geëmbed via het e5-model (384-dimensionale
   genormaliseerde vector, met `query: ` prefix)
2. Het **gemiddelde** van alle ankervectoren wordt berekend (de
   "topic centroid")
3. Elke ankervector wordt **gecenterd**: ankervector − gemiddelde,
   daarna hernormaliseerd

### Bij elke evaluatie

1. De tekst wordt geëmbed (`query: <tekst>`, mean pooling, genormaliseerd)
2. De topic centroid wordt afgetrokken en het resultaat wordt hernormaliseerd
3. Cosinus-gelijkenis wordt berekend tussen de gecenterde invoer en elke gecenterde anker
4. Softmax (met een instelbare temperatuur, default 50) bepaalt per
   anker een gewicht
5. De score is een gewogen gemiddelde van de anker-scores

### Waarom contrastieve centrering?

Zonder centrering liggen alle anker-similarities in een smalle band
(0.85-0.95), omdat het model onderwerp-gelijkenis zwaarder laat
meewegen dan register. Door de gemeenschappelijke "topic-vector" af
te trekken blijft de residuele variatie over, die sterker correleert
met register. Resultaat: de ML-score laat meer spreiding zien en
reageert beter op stijlverschillen.

### Max rauwe similariteit (voor guardrail)

Naast de gecenterde scores wordt ook de **maximale ongecenterde
similariteit** met een anker teruggegeven. De guardrail-laag gebruikt
die om te detecteren wanneer de invoer überhaupt niet in de buurt
van het scenario-onderwerp ligt (drempel 0.78).

---

## 4. Debounce-strategie

Regels draaien synchroon bij elke toetsaanslag. ML draait niet — dat
zou op zwakke laptops merkbaar haperen. In plaats daarvan:

- Elke toetsaanslag: regels direct, `mlPending: true` gesignaleerd
- Na 800 ms zonder nieuwe toetsaanslag: ML draait eenmalig
- Een nieuwe toetsaanslag tijdens de 800 ms: timer en eventuele ML-call worden gecancelled

De 800 ms is instelbaar via de debounce-slider in admin (200-2000 ms).

Bij scherm-overgangen en bij "Pauzeer" worden pending ML-calls
gecancelled via een cancel-token in [`scorer.js`](prototype_v2/engine/scorer.js).

---

## 5. Softmax-temperatuur tuning

In de eerste versie gaf de ML te vlakke scores omdat de sims zo dicht
bij elkaar lagen. Twee ingrepen lossen dat op:

1. **Contrastieve centrering** (zie hierboven) — spreidt de similarities uit
2. **Hogere softmax-temperatuur** — maakt de weging scherper

Default temperatuur is 50. Instelbaar via een tweede slider in admin:

- **Lager (10-30)**: alle ankers wegen bijna even zwaar → score gaat richting middel
- **Default (50)**: gebalanceerd, bruikbaar voor het huidige scenario
- **Hoger (80-120)**: sterke voorkeur voor het dichtstbijzijnde anker → scherpe scores, hoger risico op "zelfverzekerd fout"

De waarde wordt live uit `config` gelezen, dus schuiven van de slider
heeft onmiddellijk effect op de volgende evaluatie.

---

## 6. Bestandsstructuur

```
prototype_v2/
├── index.html       Alle schermen + guardrail-modal
├── styles.css       Alle styling
├── app.js           Schermnavigatie, writing scene, reactie, rapport, guardrails UI
├── admin.js         Admin-paginalogica
└── engine/
    ├── config.js    Gedeelde state (modus, debounce, softmaxTemperature) + localStorage
    ├── rules.js     Regelgebaseerde scorer
    ├── anchors.js   Anker-zinnen (één scenario)
    ├── ml.js        Transformers.js wrapper + contrastieve centrering + scoring
    ├── scorer.js    Orchestreert beide lagen per modus, houdt logs bij
    └── guardrails.js Detecteert gibberish, beledigingen, meta, off-topic
```

De module-afhankelijkheden:

```
config.js   ← geen deps (basis)
rules.js    ← geen deps
anchors.js  ← geen deps
ml.js       ← config.js, anchors.js, Transformers.js (CDN)
scorer.js   ← rules.js, ml.js, config.js
guardrails.js ← anchors.js (alleen voor context, niet runtime gebruikt)
app.js      ← alle bovenstaande + admin.js
admin.js    ← config.js, ml.js, scorer.js
```

---

## 7. Guardrail-laag

Op de Verstuur-knop draait een check vóór de navigatie naar de
reactie-scène. Deze check zit in
[`guardrails.js`](prototype_v2/engine/guardrails.js) en kijkt naar:

1. **Gibberish** — minder dan 3 woorden én korter dan 25 tekens
2. **Beledigingen** — een kleine lijst Nederlandse patterns
3. **Meta/test-gedrag** — "this is a test", "ignore instructions", "asdfgh", etc.
4. **Off-topic regel-gebaseerd** — ≥20 woorden zonder scenario-keywords
5. **Off-topic ML-gebaseerd** — maxRawSim < 0.78 (alleen in ml/hybrid modus)

Bij een hit verschijnt een vriendelijke modal. De navigatie naar de
reactie-scène wordt geblokkeerd totdat de student opnieuw probeert.

---

## 8. Wat opvalt in de praktijk

Na het live testen:

- **Regels scoren extreem formele teksten makkelijk te hoog** (geen
  bovengrens voor "te formeel"). Het ML-model vangt dit subtieler op.
- **ML herkent gemengde registers** (formele opening + informele
  afsluiting) beter dan regels.
- **Regels zijn veel gevoeliger voor signaalwoorden** (bv. "ff", "ofzo").
- **In rules-only modus** heeft de guardrail-laag minder gereedschap:
  geen ML-topicality-check, dus creatief off-topic tekstwerk glipt
  er soms doorheen. Dat is een bewuste trade-off: rules-only moet
  snel en gratis blijven.

---

## 9. Wat er bewust niet in zit

- **Fine-tuning**: out-of-the-box model, geen scenario-specifieke training
- **Meer scenario's**: ankers en keywords zijn hardcoded voor één scenario
- **Per-scenario calibratie**: één softmax-temperatuur voor alles
- **Generatieve LLM-output**: geen dynamische reactie-tekst, alleen
  statische gedachtebellen per score-band
- **Server-side fallback**: als het lokale model niet laadt is er geen
  cloud-backup (bewust, voor privacy en kostenbeheersing)

Al deze beperkingen zijn bewust — ze hebben allemaal een volgende
iteratie als antwoord, maar staan nu niet in de weg.
