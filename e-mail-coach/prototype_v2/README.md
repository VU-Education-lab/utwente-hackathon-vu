# E-mailStories — hybride prototype (v2)

Werkend prototype van de E-mailStories-app, waarin studenten e-mails
leren schrijven door ze als kort verhaal te beleven. Dit is de
hybride versie: de ToonMeter werkt met een regelgebaseerde én een
ML-gebaseerde aanpak, die je vanuit een admin-pagina kunt vergelijken.

## Starten

Omdat deze versie ES-modules gebruikt en een lokaal taalmodel laadt,
kun je `index.html` niet zomaar dubbelklikken — je hebt een
eenvoudige lokale webserver nodig:

```sh
cd /Users/silvesterdraaijer/Documents/GitHub/e-mail-coach/prototype_v2
python3 -m http.server 8000
```

Daarna in de browser:

```
http://localhost:8000
```

**Browsers**: Chrome, Edge of recente Safari werken het best.
Transformers.js draait op WebAssembly en gebruikt optioneel WebGPU.

## Eerste keer

1. Open de app → je komt op het **home-scherm**
2. Klik rechtsboven op het tandwiel ⚙ → **admin-pagina**
3. Kies modus **Hybride**
4. In de "Model"-sectie: klik **Laad model**
   (eerste keer ~120 MB, duurt 30-90s afhankelijk van je verbinding)
5. Na laden wordt het status-bolletje groen
6. Ga terug naar home → kies **"Herkansing aanvragen"** → doorloop het verhaal
7. In de schrijfscène zie je nu twee naalden op de meter:
   - **Zwarte bol (vol)** = regels, update elke toetsaanslag
   - **Oranje cirkel (gestreept)** = ML, update ~800ms na laatste toetsaanslag

## Wat zit er in

### Schermen voor de student

| Scherm | Doel |
|---|---|
| **Home** | Scenario-keuze + toegang tot "Leer over e-mails schrijven" + admin (tandwiel) |
| **Leer-pagina** | 14 uitklapbare onderwerpkaarten over register, stijl, structuur, toon, en e-mailangst |
| **Karakterkaart** | Portret van Prof. Hendriks + vibe-indicator met "sweet spot"-uitleg |
| **Story-intro** | Situatieschets: oma in ziekenhuis, tentamen morgen |
| **Schrijfscène** | Onderwerpregel-invoer met eigen rules+ML feedback, editor met ToonMeter (één of twee naalden), signaalwoord-hints, verstuurknop |
| **Reactie** | Gezichtsuitdrukking + gedachtebel van de hoogleraar, gebaseerd op score |
| **Rapport** | Jouw e-mail + observaties + drie versies naast elkaar |

### Admin-pagina (voor testen en tunen)

- **Modus**: rules-only / ML-only / hybride — keuze wordt bewaard in localStorage
- **Modelstatus**: laden/klaar/fout-indicator met voortgangsbalk
- **Instellingen**:
  - ML debounce (200-2000 ms) — hoe lang wachten na laatste toets
  - Softmax temperatuur (10-120) — hoe scherp het ML-model weegt tussen ankers
- **Test-bench**: plak e-mail of kies uit 8 voorbeelden, krijg beide
  scores naast elkaar met signalen + dichtstbijzijnde ankers
- **Logs**: laatste 50 evaluaties (live + test-bench)

### Guardrails

Bij het klikken op **Verstuur** checkt de app:

1. **Onderwerpregel leeg** — blokkeert met uitleg over waarom een onderwerpregel belangrijk is
2. **Gibberish** — te kort of geen echte woorden in de body
3. **Beledigingen** — scheldwoorden richting de ontvanger
4. **Meta/test-gedrag** — "this is a test", "ignore instructions", etc.
5. **Off-topic** — zowel regel-gebaseerd (geen scenario-zoekwoorden) als
   ML-gebaseerd (lage maximale similariteit met ankers)

Bij een hit verschijnt een vriendelijke modal die de student uitnodigt
opnieuw te proberen, zonder de voortgang door te laten. De toon is
uitnodigend, niet bestraffend.

## Bestandsstructuur

```
prototype_v2/
├── index.html        Alle schermen (home, learn, admin, character, intro, write, reaction, report) + guardrail modal
├── styles.css        Alle styling
├── app.js            Schermnavigatie, writing scene, reactie, rapport, guardrail-handling
├── admin.js          Admin-paginalogica (modus, model, sliders, test-bench, logs)
├── README.md         Dit bestand
└── engine/
    ├── config.js     Gedeelde state (modus, debounce, softmaxTemperature) + localStorage
    ├── rules.js      Regelgebaseerde scorers voor body (formaliteit) en subject (kwaliteit)
    ├── anchors.js    Body-ankers én subject-ankers voor het hoogleraar-scenario
    ├── ml.js         Transformers.js wrapper, embeddings, contrastieve centrering, body + subject scoring
    ├── scorer.js     Orchestreert rules + ml voor zowel body als subject, houdt logs bij
    └── guardrails.js Check op lege subject, gibberish, beledigingen, meta, off-topic
```

## De twee scoring-aanpakken

### Regels (altijd aan)

Een lichtgewicht functie die elke toetsaanslag scoort op basis van
detecteerbare signalen:

- Aanhef ("Geachte" vs "Hey")
- Aanspreekvorm-verhouding (u/je)
- Afsluiting ("Met vriendelijke groet" vs "Groetjes")
- Emoji-count, uitroeptekens, spreektaal
- Hoofdlettergebruik
- Lengte

Resultaat: een score van 0-100 en een lijst hints die als chips onder
de editor verschijnen. Snelheid: ~1 ms.

### ML (via Transformers.js)

Laadt `Xenova/multilingual-e5-small` (~120 MB) in de browser en
gebruikt het als embedding-model. Bij het laden:

1. Elke anker-zin wordt omgezet naar een vector
2. Het gemiddelde van alle ankervectoren wordt berekend ("topic centroid")
3. Elke ankervector wordt gecentreerd (anker − gemiddelde) en opnieuw genormaliseerd

Bij elke evaluatie:

1. De invoer wordt geëmbed
2. Het gemiddelde wordt eraf getrokken en genormaliseerd
3. Cosinus-gelijkenis wordt berekend tussen de gecenterde invoer en elke gecenterde anker
4. Softmax (temperatuur 50 default) bepaalt hoe zwaar elke anker meetelt
5. De score is een gewogen gemiddelde van de anker-scores

**Waarom contrastieve centrering?** Zonder dat trucje liggen alle
anker-similarities in een smalle band (0.85-0.95), omdat het model
onderwerp-gelijkenis zwaarder laat meewegen dan register-gelijkenis.
Door de gemeenschappelijke "topic-vector" af te trekken blijft alleen
de variatie over — die correleert sterker met register.

De ruwe (ongecenterde) maximale similariteit wordt ook teruggegeven,
zodat de guardrail-laag kan detecteren wanneer de invoer totaal niet
over het scenario gaat.

## Bekende beperkingen

- **Eén scenario**: anker-zinnen en scenario-zoekwoorden zijn
  geschreven voor het hoogleraar/herkansing-verhaal. Uitbreiden naar
  andere scenario's vereist nieuwe ankers en nieuwe keywords per
  scenario — structureel nog niet gefactoriseerd.
- **Geen PWA**: geen service worker, geen manifest. Bij deploy moet
  dat nog worden toegevoegd om offline-first te werken en installatie
  op telefoons mogelijk te maken.
- **ML alleen bij ml/hybrid modus**: in rules-only modus wordt het
  model niet geladen en kunnen ML-guardrail-checks niet draaien —
  bewuste keuze om de snelste modus ook echt snel te houden.
- **Softmax temperatuur is globaal**: één instelling voor alle
  scenario's. Zodra je meer scenario's met verschillende
  anker-verdelingen hebt, wil je dit waarschijnlijk per-scenario maken.
- **Admin-pagina is mobile-layout**: past binnen het telefoon-frame,
  scrollbaar. Niet geoptimaliseerd voor groter scherm.

## Volgende stappen (indicatief)

- Extra scenario's (stage, huisarts) met eigen ankers en keywords
- Refactor scenario-bundels naar JSON-bestanden
- PWA-manifest + service worker voor installeerbaarheid en offline-mode
- "Jouw situatie"-modus (eigen e-mail invoeren, app genereert het scenario)
- Voortgangsdashboard met organische groei-iconen per vaardigheid
- Deel-kaart na afloop van een scenario
