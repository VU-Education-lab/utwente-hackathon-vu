# E-mail Coach

## Overzicht

E-mail Coach is een web-app die Gen Z-studenten helpt om e-mails te schrijven aan ontvangers die ze spannend vinden — een hoogleraar, een stagebegeleider, een arts. De app laat studenten een realistische situatie beleven als kort verhaal, geeft ze live feedback op de toon terwijl ze schrijven, en laat de ontvanger zichtbaar reageren op wat er verstuurd wordt. Het doel is dat registerbewustzijn niet wordt *uitgelegd* maar  *gevoeld* .

De werknaam voor het hoofdconcept is **E-mailStories**. Er staat nu een werkend prototype in [prototype_v2/](prototype_v2/) met één speelbaar scenario (herkansing aanvragen bij een hoogleraar), een leer-pagina met 14 onderwerpen, een admin-pagina voor tuning, en een hybride toon-beoordeling die regels combineert met een lokaal taalmodel via Transformers.js. Alles draait in de browser van de student — geen server, geen API-calls, geen kosten per gebruik.

## Doel

Veel GenZ-ers hebben moeite om e-mails te schrijven. Ze hebben daar angst voor. Dat wordt ingegeven doordat ze weinig oefening hebben gehad en moeite hebben om in te schatten hoe e-mails door de ontvanger worden ervaren. Vooral als de ontvanger hiërarchisch hoger is (bijv. iemand die ouder is, een arts, docent, hoogleraar, directeur e.d.). GenZ-ers weten weinig over register en stijlen van schrijven. Ze weten niet dat ze bij een onbekende persoon eerst zouden kunnen of moeten kiezen voor een meer formele toon, maar ook niet  te formeel. En als blijkt dat de reactie informeler of formeler is dat de stijl dan kan worden aangepast. Misschien hebben ze ook geen zicht in de benodigde gewenste lengte, het gebruik van hoofdletters en leestekens. Het afzien of juist toch gebruik van emoticons. Etc.
We weten al dat GenZ-ers vaak ook vragen aan ChatGPT om hen te helpen om dit soort e-mails te schrijven. Of ze dat op een zinvolle manier aanpakken, dat weet ik niet.

## Functionaliteit


### "E-mailStories" — Leer e-mails schrijven door verhalen te beleven én te voelen

Een narratieve app waarbij studenten e-mailsituaties ervaren als een kort, interactief verhaal — en tegelijkertijd leren *aanvoelen* wat de juiste toon is voor de ontvanger.

---

### Het concept

De student stapt een verhaal binnen. Niet als toeschouwer, maar als hoofdpersoon. Ze zien een gesplitst scherm: links ontvouwt zich de situatie als een levendige animatie of strip — rechts schrijven ze zelf de e-mail, of kiezen ze op cruciale momenten tussen opties. Op elk moment geeft een **live ToonMeter** feedback op wat ze schrijven of kiezen, zodat registerbewustzijn niet wordt  *uitgelegd* , maar  *gevoeld* .

---

### Hoe het werkt

**Stap 1 — Kies je scenario en ontvanger**
De student kiest een situatie uit een visueel menu van realistische scenario's: een gemist college uitleggen aan een docent, een stageplek aanvragen bij een bedrijf, een herkansing vragen aan een examencommissie. Bij elk scenario kiest ze de ontvanger via een karakterkaart: leeftijd, functie, communicatiestijl en een kleine "vibe-indicator" die de verwachte formaliteit suggereert — maar niet expliciet zegt wat goed of fout is.

**Stap 2 — Het verhaal begint**
De situatie ontvouwt zich als een korte animatie of strip. De student is de hoofdpersoon. Ze zien de context, voelen de urgentie. Dan pauzeert het verhaal: *het is tijd om de e-mail te schrijven.*

**Stap 3 — Schrijven met live ToonMeter**
De student schrijft in een editor. Rechtsboven pulseert de ToonMeter — een schaal van  *te informeel → goed gekalibreerd → te formeel* . Signaalwoorden lichten op in de tekst zelf: "Hey!" kleurt rood bij een hoogleraar-scenario, een ontbrekende aanhef geeft een zachte waarschuwing, een emoji bij een formele ontvanger krijgt een vraagteken. De meter geeft geen oordeel, maar een gevoel — zoals een kompas, geen rechter.

**Stap 4 — De ontvanger reageert**
Het verhaal gaat verder. De student ziet een korte videoclip of animatie van de ontvanger die de e-mail leest — met zichtbare gezichtsuitdrukking en een gedachtebel met innerlijke reactie. Een te informele e-mail levert een fronsende hoogleraar op die denkt: *"Is dit een appje?"* Een te stijve e-mail bij een jonge stagebegeleider geeft: *"Oké... een beetje overdreven."* Een goed gekalibreerde e-mail: opluchting, een vriendelijke reactie.

**Stap 5 — Keuzemomenten en consequenties**
Niet alles wordt zelf geschreven. Op strategische momenten pauzeert het verhaal en verschijnen drie kaarten: welke openingszin kies je? Welke afsluiting past hier? De student kiest, en ziet direct het effect in de animatie. Dit maakt de link tussen *toonkeuze* en *ontvangst* concreet en memorabel.

**Stap 6 — Het e-mailrapport**
Na afloop krijgt de student een overzicht van haar keuzes: aanhef, lengte, toon, leestekens, hoofdlettergebruik, emoji-gebruik — elk onderdeel kort toegelicht met een illustratie uit de e-mail die ze zojuist schreef. Geen abstracte theorie, maar herleidbaar naar haar eigen woorden. Daarnaast ziet ze twee alternatieve versies van haar e-mail (te formeel / te informeel) naast haar eigen versie, zodat het register tastbaar wordt.

---

### Wat de app verder biedt

Een **"Pas aan"-modus** laat de student haar e-mail na de eerste reactie herzien — want net als in echte correspondentie kun je van de reactie leren en bijsturen. Ze schrijven opnieuw, de ontvanger reageert opnieuw. Zo leren ze dat register geen vaste regel is, maar een dialoog.

Een **"Jouw situatie"-modus** laat de student een eigen scenario invoeren — een echte e-mail die ze moeten schrijven. De app genereert daar automatisch een passend verhaal omheen, inclusief karakterkaart voor de ontvanger en ToonMeter-feedback.

Stories zijn **kort en deelbaar** — drie tot vijf minuten per scenario, met een resultaatkaart die je kunt delen (zonder de inhoud van de e-mail, alleen de uitkomst en score). Dit geeft de app ook een sociaal element dat aansluit bij hoe Gen Z content beleeft.

Een **voortgangsdashboard** houdt bij welke vaardigheden al sterk zijn en welke nog aandacht vragen — niet als rapportcijfer, maar als een eenvoudige visuele kaart van sterke en zwakke punten.

---

### Multimedia & interactiviteit op een rij

| Element                             | Functie                                         |
| ----------------------------------- | ----------------------------------------------- |
| Animatie/strip als verhaalframe     | Context en empathie creëren                     |
| Live ToonMeter in de editor         | Registerbewustzijn voelen, niet lezen           |
| Videoclip/animatie van de ontvanger | Consequentie van toon zichtbaar maken           |
| Keuzekaarten op sleutelmomenten     | Actief beslissen in plaats van passief lezen    |
| E-mailrapport met eigen tekst       | Reflectie op eigen werk, geen abstracte theorie |
| "Jouw situatie"-modus               | Directe koppeling aan de echte wereld           |
| Deelbare resultaatkaart             | Sociale laag die past bij Gen Z                 |

---

E-mailStories combineert het beste van beide concepten: de *empathie voor de ontvanger* en het *registerbewustzijn* van ToonRadar, gevat in de *laagdrempelige, narratieve en deelbare structuur* van InBox Stories. Studenten leren niet over e-mails schrijven — ze beleven het.

## Huidige staat (prototype_v2)

Er staat een werkend prototype in [prototype_v2/](prototype_v2/). Wat er tot nu toe is gebouwd, en wat bewust nog niet.

### Wat werkt

**Voor de student:**

- **Home** met scenario-lijst (zeven scenario's: één speelbaar — herkansing aanvragen, nu in twee varianten — en zes vergrendeld als placeholder: stageplek vragen, uitstel inleveren opdracht, waar is het tentamen, inzage tentamen na cijfer, klachtenprocedure indienen, en oninteressant college melden). Elk scenario is ontworpen om te worden gedaan in twee varianten: één met een heel formele hoogleraar en één met een vrij informele — zodat de student ervaart hoe dezelfde boodschap van register moet veranderen afhankelijk van de ontvanger. De klachtenprocedure is een uitzondering: alleen formeel, want die is inherent formeel (gericht aan de examencommissie). Op home staat ook een **Leer-kaart** naar een aparte leer-pagina, en rechtsboven een tandwiel voor de admin
- **Variant-picker** (nieuw tussenscherm) verschijnt na klikken op een scenario. Toont beide ontvanger-varianten naast elkaar (portret, naam, rol, korte karakterisering) en laat de student kiezen. Voor herkansing zijn dat: *Prof. dr. Hendriks* (formele hoogleraar, bestaande) en *Dr. Nadia el-Fassi* (informele docent, nieuw)
- **Leer-pagina** met 14 uitklapbare onderwerpkaarten in drie secties: *Het basisrepertoire* (aanhef, register, structuur, onderwerpregel, jezelf introduceren), *De details die tellen* (lengte, hoofdletters/leestekens, emoji's, beleefdheidsmarkers, toonvalkuilen) en *Voorbij het versturen* (herlees-ritueel, e-mail vs. appje, de reactie als dialoog, waarom e-mailangst bestaat)
- **Karakterkaart** van Prof. Hendriks met portret, drie vibe-tags, een vibe-meter met donkere "sweet spot"-marker, en een korte toelichting ("niet te los, niet te stijf — probeer daar in de buurt te landen. Een gevoelskwestie, geen rekensom.")
- **Story-intro** met de situatieschets (oma in ziekenhuis, tentamen morgen, prof. Hendriks staat bekend als precies)
- **Schrijfscène** met een invoerveld voor de onderwerpregel (die de student zelf bedenkt) met eigen rules+ML feedback in drie banden (zwak/matig/goed), textarea voor de e-mail zelf, **ToonMeter** met target-zone en een of twee ademende naalden, signaalwoord-hint-chips onder de editor, ML-statusbadge, en Verstuur-knop met guardrail-check
- **Ontvanger-reactie** met SVG-gezicht (vier expressies op basis van score) en gedachtebel ("Is dit een appje?" / "Helder en respectvol — dank je" / etc.)
- **E-mailrapport** met de eigen e-mail, observaties per bouwsteen, en drie versies naast elkaar (te informeel / jouw versie / te formeel)

**Voor de auteur (admin-pagina):**

- **Modus-selector**: rules-only / ML-only / hybride, om de twee scoring-aanpakken naast elkaar te vergelijken
- **Modelstatus** met laad-knop en voortgangsbalk (eerste keer ~120 MB download voor het lokale taalmodel, daarna gecached in de browser)
- **Sliders** voor ML-debounce (hoe lang wachten na laatste toetsaanslag) en softmax-temperatuur (hoe scherp het ML-model weegt tussen ankers)
- **Test-bench** met 8 voorbeeld-e-mails en een vrij tekstveld; geeft beide scores naast elkaar plus gedetecteerde signalen en dichtstbijzijnde ankers
- **Logs** van de laatste 50 evaluaties (live en test)

**Veiligheid en guardrails:**

Bij het versturen controleert de app:

1. **Ontbrekende onderwerpregel** — blokkeert met uitleg waarom een onderwerpregel belangrijk is
2. **Gibberish** in de body — te kort of geen echte woorden
3. **Beledigingen** richting de ontvanger
4. **Meta/test-gedrag** — "this is a test", "ignore instructions", "asdfgh", etc.
5. **Off-topic** — regel-gebaseerd (geen scenario-zoekwoorden) én ML-gebaseerd (lage maximale similariteit met ankers)

Bij een hit verschijnt een vriendelijke modal die de student uitnodigt opnieuw te proberen — de toon is uitnodigend, niet bestraffend.

### Hoe de ToonMeter werkt

Twee scoring-lagen die samenwerken:

- **Regels** draaien synchroon op elke toetsaanslag: ze tellen signaalwoorden, aanhef-vormen, u/je-verhoudingen, emoji's, uitroeptekens, hoofdlettergebruik en lengte
- **ML** draait gedebounced (~800 ms na laatste toetsaanslag): een lokaal embedding-model (`Xenova/multilingual-e5-small`) vergelijkt de tekst met zes anker-zinnen op bekende formaliteitsniveaus, via contrastieve centrering (de gemeenschappelijke "topic-vector" wordt afgetrokken zodat register-verschillen beter zichtbaar zijn)

In hybride modus zie je beide scores tegelijk op dezelfde meter — een zwarte "ademende" bol voor de regels en een oranje gestreepte cirkel voor het ML-model. De meter heeft de labels "informeel" boven en "formeel" onder, met een gestippelde **target-zone die per variant meebeweegt**: voor een formele hoogleraar staat hij op 60-85% (de formele band), voor een informele docent op 35-65% (meer ontspannen). De anker-set en de scoring-logica blijven gelijk — alleen de interpretatie van de score (wat is "goed") verandert per ontvanger. De uiteindelijke score bij versturen is het gemiddelde van de twee.

**Onderwerpregel-scoring** werkt parallel maar gescheiden: een eigen rule-based scorer (vaag/specifiek, lengte, hoofdletters, scenario-woorden) en een eigen set ML-ankers met eigen contrastieve centrering. Uitkomst in drie banden: zwak, matig, goed. De rand van het invoerveld kleurt mee.

**Geen oordeel mogelijk**: als rules en ML in hybride modus meer dan 35 punten uit elkaar liggen (wat vaak gebeurt bij onzin-input of ongewone tekst), toont de reactie-scène géén kunstmatig gemiddelde. In plaats daarvan verschijnt een "puzzled" gezicht met de boodschap dat er geen betrouwbaar oordeel gegeven kan worden, en wordt de "Lees rapport"-knop verborgen. Alleen "Pas aan" blijft zichtbaar — zo wordt de student teruggestuurd naar de editor om opnieuw te proberen.

### Wat nog niet in de prototype zit

Uit de vision-secties hierboven is het volgende **bewust** nog niet gebouwd, omdat het eerst belangrijker was om de kern-ervaring te valideren:

- **Echte animaties en strips** voor verhaal-intro en ontvanger-reactie — nu statische illustraties en SVG-gezichten
- **Videoclip-reacties** — nu een stilstaand gezicht met gedachtebel
- **Keuzemomenten met drie kaarten** tijdens het schrijven — nu alleen een vrije editor
- **"Pas aan"-modus als eigen flow** met herhaalde reacties — nu kun je wel terug naar de editor via een knop, maar zonder echte dialoog-iteratie
- **"Jouw situatie"-modus** voor eigen scenario-invoer
- **Voortgangsdashboard**
- **Deelbare resultaatkaart**
- **Extra scenario's** (stage, huisarts) — ankers en guardrail-keywords moeten per scenario worden geschreven

### Techniek in het kort

- Eén HTML-bestand (`index.html`) met alle schermen; één CSS-bestand; gesplitst JavaScript in `app.js`, `admin.js`, en een `engine/` map met `config.js`, `rules.js`, `anchors.js`, `ml.js`, `scorer.js`, `guardrails.js`
- ES-modules — vereist een lokale webserver tijdens ontwikkeling
- Transformers.js (via CDN) voor het lokale taalmodel
- localStorage voor het bewaren van modus, debounce-tijd en softmax-temperatuur tussen sessies
- Geen backend, geen API-calls, geen tracking, geen cookies
- Voor productie: hosten als statische webapp op Netlify / Vercel / Cloudflare Pages / GitHub Pages — studenten openen dan gewoon een URL
- **Broncode**: privé-repo op GitHub — [silvesterdraaijer-sudo/e-mail-coach](https://github.com/silvesterdraaijer-sudo/e-mail-coach)

### Modelkeuze en alternatieven

**Huidig model**: `Xenova/multilingual-e5-small` — ongeveer 120 MB gequantiseerd

Technische details:

- Gebaseerd op de **e5-familie** van Microsoft/intfloat, via ONNX-conversie door het Xenova-team (de makers van Transformers.js)
- Architectuur: XLM-RoBERTa-basis, 12 lagen, 384-dimensionale output-vectoren
- **Multilingual** — ondersteunt 100+ talen inclusief Nederlands
- Getraind met een contrastieve-learning-doelstelling voor zin-embeddings (niet voor tekstgeneratie)
- Inference: ongeveer 50-300 ms per tekst op een gemiddelde laptop, via WebAssembly; optioneel versneld via WebGPU
- Gecached in de browser na de eerste download (IndexedDB)

> **Belangrijke nuance**: dit is **geen generatieve LLM** zoals ChatGPT, Claude, Llama of Qwen. Het is een *bidirectional encoder* die tekst omzet in vectoren. Voor onze use case — tekst classificeren via cosinus-similariteit met anker-zinnen — is een embedding-model dramatisch efficiënter dan een generatief model. Generatieve LLMs zouden voor deze taak pure overkill zijn (groter, trager, en niet beter in vector-vergelijking).

**Realistische alternatieven** (mocht er ooit reden zijn om te wisselen):

| Model | Grootte | Kenmerk |
|---|---|---|
| `Xenova/multilingual-e5-base` | ~280 MB | Upgrade binnen dezelfde e5-familie. 768-dim vectoren, betere nuance op subtiele registerverschillen, 2-3× trager in inference |
| `Xenova/multilingual-e5-large` | ~560 MB gequantiseerd | Beste kwaliteit in e5-familie, maar zwaar voor zwakke studentenlaptops |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | ~120 MB | Zelfde gewichtsklasse, andere trainingsopzet (paraphrase-similariteit in plaats van retrieval). Interessante A/B-tester: verschillende trainingsdoelen geven verschillende gevoeligheden voor register |
| `Xenova/paraphrase-multilingual-mpnet-base-v2` | ~280 MB | Zwaardere variant van de paraphrase-familie. MPNet-backbone, vaak hogere kwaliteit dan MiniLM |
| BERTje / RobBERT (Nederlands) | ~110-120 MB | **Nederlands-specifiek**, getraind op Nederlandse corpora. Scherpere taalnuances mogelijk, maar: niet beschikbaar in de Xenova-namespace — vereist eigen ONNX-conversie en verliest multilingual-ondersteuning. Meer opzetwerk dus |
| `Xenova/all-MiniLM-L6-v2` | ~80 MB | Veel kleiner en sneller, maar **Engels-only of zwak multilingual** — niet geschikt voor Nederlands |

**Wanneer zou een wissel zinvol zijn**:

- Als studenten consequent ervaren dat de ML-score "niet klopt" en we na tuning van ankers en softmax-temperatuur geen verbetering zien → **upgrade naar `multilingual-e5-base`**
- Als de 120 MB download een echte drempel blijkt voor studenten met zwakke verbinding → **downgrade naar kleiner model** of een zelf gefinetuneerde classifier (zie [corpus_plan.md](corpus_plan.md))
- Als we Nederlands-first willen gaan en ondersteuning voor andere talen opgeven → **BERTje of RobBERT** met eigen ONNX-conversie
- Voor diepere Dutch-specifieke register-herkenning zónder andere talen op te geven → een gefinetuneerd multilingual model op een eigen corpus (structureel werk, niet een knop)

**Conclusie voor nu**: `multilingual-e5-small` is een goede middenweg tussen grootte, Nederlandse kwaliteit, en browser-performance. Blijf bij deze keuze tot er een concrete reden is om te wisselen.

**Buiten de embedding-familie** zijn er ook **generatieve LLMs** die in de browser draaien (via WebLLM, niet Transformers.js): Qwen 2.5 0.5B (~400 MB), Llama 3.2 1B (~700 MB-1.2 GB), Phi-3 mini (~2 GB). Die zijn veel groter, trager, en voor onze classificatie-taak overkill. Ze worden pas interessant als we dynamische tekstgeneratie nodig hebben — bijvoorbeeld voor de "Jouw situatie"-modus waar de app zelf een scenario moet bedenken op basis van student-input. Dat is nu niet in scope.

Voor meer detail: zie [prototype_v2/README.md](prototype_v2/README.md), [ui_plan.md](ui_plan.md) voor het UI-overzicht, en [hybrid_plan.md](hybrid_plan.md) voor de architectuur van de hybride scoring.

## Setup

### Lokaal draaien (voor ontwikkeling)

Omdat de prototype ES-modules en een lokaal taalmodel gebruikt, kun je `index.html` niet simpelweg dubbelklikken. Je hebt een kleine lokale webserver nodig:

```sh
cd prototype_v2
python3 -m http.server 8000
```

Daarna in de browser naar:

```
http://localhost:8000
```

Gebruik Chrome, Edge of een recente Safari — Transformers.js werkt daar het best.

### Eerste keer

1. Open de app → home-scherm
2. Klik rechtsboven op het tandwiel ⚙ → admin
3. Kies modus **Hybride**
4. Klik **Laad model** (eerste keer ~120 MB, duurt 30-90 seconden afhankelijk van je verbinding; daarna gecached in de browser)
5. Wacht tot het statusbolletje groen wordt
6. Ga terug naar home → kies "Herkansing aanvragen" → doorloop het verhaal

### Voor eindgebruikers (in de toekomst)

De bedoeling is om de app te hosten als statische webapp — studenten krijgen dan gewoon een URL en hoeven niets te installeren. Een PWA-manifest en service worker maken het mogelijk om de app "toe te voegen aan beginscherm" op telefoons, en om offline te werken nadat het model eenmaal is gedownload. Die productie-stap is nog niet gezet; voor nu draait de prototype lokaal.

## Recente wijzigingen

Logboek van wat er wanneer is veranderd. Nieuwe entries bovenaan. Per sessie/dag één blok.

### 2026-04-09

- **Toegevoegd**: scenario- en variant-selectors in de admin **test-bench**. Twee dropdowns boven het invoerveld: scenario (nu alleen *Herkansing aanvragen*) en ontvanger (de twee varianten). Wanneer je een test draait verschijnt onder de scores een nieuw blok **"Interpretatie voor [naam ontvanger]"** met de target-zone, of de combined score in/uit de zone valt, en de voorspelde reactie (gezicht + zin). Zo kun je dezelfde e-mail twee keer testen — één keer voor Hendriks, één keer voor Nadia — en zien hoe de interpretatie verschuift terwijl de ruwe scores hetzelfde blijven. De selectie hierboven is **lokaal aan de admin** — verandert niet de actieve variant in de student-flow. Nieuwe helpers in `engine/scenarios.js`: `getReactionForScore()`, `scoreInZone()`, `getAllScenarioKeys()`. SVG-gezichten zijn verhuisd van `app.js` naar nieuw bestand `engine/faces.js` zodat zowel de live reactie-scène als de admin test-bench dezelfde set kunnen gebruiken
- **Gefixt**: rules-hints en rapport-notities waren nog hardcoded alsof de ontvanger altijd een formele hoogleraar was ("je tegen een hoogleraar voelt direct", "past bij iemand die je niet kent"). Rules-hints zijn nu **neutraal beschrijvend** (vertellen wat er gedetecteerd is, niet of het goed/slecht is — het oordeel komt uit de positie op de ToonMeter ten opzichte van de target-zone). Rapport-notities zijn **variant-aware** gemaakt: ze gebruiken de naam van de actieve ontvanger en passen de strekking aan (voor Nadia is "je" juist passend, voor Hendriks te direct). De algemene toon-beoordeling gebruikt nu de target-zone van de actieve variant in plaats van hardcoded drempels
- **Toegevoegd**: het herkansing-scenario is nu speelbaar in **twee varianten** — een formele (Prof. dr. Hendriks, 58 jaar, "precies en formeel-binnen-grenzen") en een informele (Dr. Nadia el-Fassi, 33 jaar, "benaderbaar, direct, professioneel-informeel"). Na klikken op het scenario op home verschijnt een nieuw **variant-picker scherm** waar de student kiest met welke ontvanger de scène wordt gedaan. De target-zone op de ToonMeter, de reactie-drempels en de ontvanger-reacties bewegen mee: voor de formele variant is de sweet spot scores 60-85, voor de informele 35-65. De ML-ankers en de rules-logica blijven gelijk — alleen de interpretatie van de score verandert per ontvanger. Nieuw bestand: [`engine/scenarios.js`](prototype_v2/engine/scenarios.js) met beide varianten als datastructuur, en de character card / story-intro / write-context / reactie-scherm zijn data-gedreven geworden
- **Hernoemd**: werknaam van het hoofdconcept van "ToonStories" naar **E-mailStories**. Reden: "Toon" mengt Dutch en English onduidelijk ("toon" in het Nederlands kan "tone" of "show" betekenen, terwijl "Stories" puur Engels is). "E-mailStories" is duidelijker omdat "e-mail" hetzelfde is in beide talen. Gewijzigd in alle documentatie (`project.md`, `ui_plan.md`, `hybrid_plan.md`, `corpus_plan.md`, `overwegingen.md`, `project_email_coach.md`, `prototype_v2/README.md`) en in de app (`index.html`, `styles.css`, oude `prototype.html`). Component-namen zoals `ToonMeter` blijven onveranderd — die zijn zowel Nederlands als Engels correct ("toon" + "meter", beide woorden bestaan in beide talen)
- **Toegevoegd**: nieuwe sectie **"Modelkeuze en alternatieven"** in project.md. Beschrijft het huidige model (`Xenova/multilingual-e5-small`, ~120 MB), de nuance dat dit een embedding-model is en geen generatieve LLM, en een curated lijst van alternatieven (e5-base, e5-large, paraphrase-MiniLM, paraphrase-mpnet, BERTje/RobBERT, all-MiniLM-L6-v2) met grootte, kenmerken, en wanneer een wissel zinvol zou zijn. Ook een korte noot over WebLLM-generatieve opties voor later
- **Toegevoegd**: [overwegingen.md](overwegingen.md) — nieuw document voor forward-looking ontwerp-overwegingen die geen beslissingen zijn maar wel aandacht verdienen bij volgende iteraties. Eerste entries over de twee-varianten-opzet, de "moeilijke" scenario's, anker-corpus schaalbaarheid, en waarom de klachtenprocedure categorisch anders is
- **Toegevoegd**: vijf nieuwe scenario-placeholders op het home-scherm — *Uitstel inleveren opdracht*, *Waar is het tentamen?*, *Inzage tentamen na cijfer*, *Klachtenprocedure indienen* (examencommissie), en *Oninteressant college melden* (dit laatste expliciet als "heel moeilijk onderwerp" aangemerkt). Nog niet speelbaar — alleen het eerste scenario (herkansing) werkt
- **Verwijderd**: placeholder voor "Afspraak verzetten" bij de huisarts
- **Toegevoegd**: ontwerpprincipe dat elk scenario in twee varianten komt — één met een heel formele hoogleraar en één met een vrij informele — zodat de student ervaart hoe hetzelfde verzoek van register moet veranderen afhankelijk van de ontvanger. Zichtbaar op home als "formeel & informeel" in de scenario-meta. De klachtenprocedure is uitzondering (alleen formeel, examencommissie)
- **Toegevoegd**: onderwerpregel is nu een verplicht invoerveld met eigen feedback-laag — zowel regelgebaseerd (vaag vs. specifiek, lengte, scenario-woorden, hoofdletters, emoji's) als ML-gebaseerd (eigen anker-set met contrastieve centrering). Score wordt weergegeven in drie banden: zwak / matig / goed
- **Toegevoegd**: guardrail die het versturen blokkeert als de onderwerpregel leeg is
- **Toegevoegd**: "geen oordeel mogelijk"-gedrag in de reactie-scène — als rules en ML in hybride modus meer dan 35 punten verschillen, toont de app geen gemiddelde meer maar een puzzled gezicht met uitleg dat de tekst niet te beoordelen is. "Lees rapport"-knop wordt dan verborgen
- **Toegevoegd**: leer-pagina met 14 uitklapbare onderwerpkaarten (register, aanhef, structuur, onderwerpregel, context geven, lengte, leestekens, emoji's, beleefdheidsmarkers, toonvalkuilen, herlees-ritueel, e-mail vs. appje, dialoog na versturen, waarom e-mailangst bestaat)
- **Verbeterd**: ToonMeter-labels zijn nu "informeel" (boven) en "formeel" (onder), consistent en inzichtelijk — voorheen stonden er "toon" (bovenaan) en "cool" (onderaan) wat mengde van twee ongelijksoortige dingen
- **Verbeterd**: target-zone op de ToonMeter staat nu op de juiste plek (60-85%, de formele band) — stond daarvoor ten onrechte op 18-43% (de informele band)
- **Verbeterd**: vibe-meter op de karakterkaart is nu consistent met de ToonMeter — gradient loopt van informeel (links, warm) naar formeel (rechts, koel), en de marker staat op ~72% passend bij een hoogleraar
- **Verbeterd**: "sweet spot"-uitleg toegevoegd aan de karakterkaart om studenten te vertellen wat de donkere stip betekent
- **Verbeterd**: softmax-temperatuur voor ML-scoring is instelbaar via een slider in de admin-pagina (default 50)
- **Verbeterd**: ToonMeter blijft consistent qua hoogte ongeacht hoeveel feedback-meldingen er onder de editor verschijnen — feedback-area heeft nu een vaste min-height
- **Verbeterd**: contrastieve centrering in het ML-model maakt onderscheid tussen registers scherper door de gedeelde "topic-vector" af te trekken
- **Verbeterd**: admin-pagina test-bench toont de dichtstbijzijnde ankers met similarity en softmax-gewicht, plus stale-results-fix zodat je niet naar oude resultaten kijkt terwijl je een nieuw voorbeeld hebt gekozen
- **Verbeterd**: vriendelijke guardrail-modal die de student terugstuurt zonder schoolmeesterachtige toon
- **Infrastructure**: broncode gepubliceerd als privé GitHub-repo ([silvesterdraaijer-sudo/e-mail-coach](https://github.com/silvesterdraaijer-sudo/e-mail-coach))
- **Documentatie**: `project.md`, `ui_plan.md`, `hybrid_plan.md`, `corpus_plan.md` en `prototype_v2/README.md` bijgewerkt naar de huidige staat
