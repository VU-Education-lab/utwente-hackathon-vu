---
name: E-mail Coach / E-mailStories project
description: Doel, doelgroep, kernconcept, en huidige staat van de e-mail-coach app voor Gen Z
type: project
---

**Project**: E-mail Coach, met als werknaam voor het hoofdconcept "E-mailStories". Vision document staat in [project.md](/Users/silvesterdraaijer/Documents/GitHub/e-mail-coach/project.md) — dat is van de gebruiker zelf, niet bewerken zonder expliciet verzoek.

**Doelgroep & probleem**: Gen Z-studenten hebben moeite met en angst voor het schrijven van e-mails, vooral aan hiërarchisch hoger geplaatsten (docenten, artsen, hoogleraren, directeuren). Ze missen oefening, kennis van register/formaliteit, en intuïtie voor hoe hun bericht overkomt. Velen leunen nu op ChatGPT zonder te weten of dat zinvol is.

**Kernfilosofie**: register wordt *gevoeld* in plaats van *uitgelegd*. Feedback is een "kompas, geen rechter" — sensorisch en empathisch, niet bestraffend.

**Concept E-mailStories**: narratieve app waarin de student hoofdpersoon is van een kort interactief verhaal (3-5 min). Flow: scenario kiezen → karakterkaart met sweet-spot-indicator → story-intro → schrijfscène met live ToonMeter → ontvanger-reactie (gezichtsuitdrukking + gedachtebel) → e-mailrapport met drie versies naast elkaar.

**Why**: De app moet Gen Z bereiken op hun eigen voorwaarden — kort, visueel, sociaal, niet-bestraffend — en de abstracte notie "register" tastbaar maken via consequenties die zichtbaar zijn op het gezicht van de ontvanger.

**How to apply**: Bij suggesties over features, copy, UI of architectuur: respecteer de narratieve toon, de "voelen niet uitleggen"-filosofie, en de Gen Z-doelgroep. Vermijd schoolse/correctieve framing. Houd sessies kort en deelbaar.

## Huidige staat (prototype_v2)

Er zijn twee versies in de projectfolder:
- `prototype.html` — originele single-file proefversie (regelgebaseerd only)
- `prototype_v2/` — huidige werkende versie, gesplitst in meerdere bestanden, met hybride rules + ML scoring

**Gebouwde schermen**: home (met leer-kaart en admin-tandwiel) → karakterkaart → story-intro → schrijfscène → reactie → rapport. Plus een **leer-pagina** met 14 uitklapbare onderwerpkaarten over e-mailangst en een **admin-pagina** met modus-keuze, modelstatus, sliders en test-bench.

**Scoring**: drie modi (rules-only / ml-only / hybride) instelbaar via admin. Rules draaien synchroon elke toetsaanslag. ML (Transformers.js + Xenova/multilingual-e5-small, ~120 MB) draait gedebounced na 800 ms. In hybride modus tonen twee naalden op dezelfde ToonMeter de scores naast elkaar. ML gebruikt contrastieve centrering: de gemiddelde ankervector wordt afgetrokken vóór vergelijking, wat de spreiding van register-sensitieve similarities vergroot. Instelbare softmax-temperatuur (default 50) in admin.

**Anker-zinnen**: zes voor één scenario (hoogleraar/herkansing), hardcoded in `engine/anchors.js`. Voor extra scenario's zijn eigen ankers nodig.

**Guardrails**: bij Verstuur-klik detecteert `engine/guardrails.js` gibberish, beledigingen, meta/test-gedrag, en off-topic (rule-based via scenario-keywords + ML-based via max ruwe similariteit). Vriendelijke modal blokkeert de voortgang bij een hit.

**Bewuste keuzes**:
- Geen PWA/service worker/manifest (nog niet)
- Geen fine-tuning, geen generatieve LLM, geen cloud-API
- Rules-only modus is bewust snelst en gebruikt geen model (geen download)
- Eén scenario nu, structuur nog niet gefactoriseerd voor multi-scenario
- Softmax-temperatuur is globaal, niet per-scenario
- Anker-zinnen maken één scenario beoordelen mogelijk; uitbreiden vereist per scenario nieuwe ankers plus nieuwe scenario-keywords voor de guardrail

**Techniek-noten**:
- ES-modules, vereist lokale webserver (`python3 -m http.server 8000` in prototype_v2/)
- Distributie-plan: hosted PWA (Netlify/Vercel/GitHub Pages) zodat studenten alleen een URL nodig hebben
- Werkt in Chrome/Edge/recente Safari; WebGPU optioneel, WASM altijd
- Model wordt gecached in IndexedDB na eerste download
- Transformers.js versie gepind op `@huggingface/transformers@3.0.2` via jsDelivr

## Vastliggende gebruikerskeuzes

- **Bestandstructuur**: gesplitst in meerdere bestanden (akkoord, geen monoliet)
- **In hybride modus bij Verstuur**: gemiddelde van rules + ML bepaalt de score
- **Lokale server**: gebruiker kent `python3 -m http.server`, werkt in terminal of via Claude chat
- **Modelgrootte**: 120 MB akkoord
- **Admin-toegang**: tandwiel rechtsboven op home (geen wachtwoord, prototype-fase)
- **Anker-zinnen**: ik schrijf ze, we tunen samen

## Documentatie

Alle docs staan in de root van de projectfolder:
- [README.md in prototype_v2](prototype_v2/README.md) — running, files, features
- [ui_plan.md](ui_plan.md) — UI-overzicht als living document
- [hybrid_plan.md](hybrid_plan.md) — architectuur-overzicht van de hybride scoring
- [corpus_plan.md](corpus_plan.md) — plan voor een test-corpus (voor later)
- [overwegingen.md](overwegingen.md) — forward-looking ontwerp-overwegingen, observaties over open spanningen en dingen om aandacht aan te besteden bij volgende iteraties (niet hetzelfde als plannen of beslissingen)
- [project.md](project.md) — vision + huidige staat + changelog

## Doorlopende verplichting: project.md bijhouden

**Vastgelegd op 2026-04-09 op verzoek van de gebruiker**: bij elke nieuwe wijziging (nieuwe feature, aanpassing, bugfix, architectuurverandering) moet `project.md` worden bijgewerkt. Er is een sectie "Recente wijzigingen" aan het einde van het document waar per datum een blok met bullets wordt toegevoegd (nieuwste bovenaan). Daarnaast moet de beschrijvende sectie "Huidige staat" synchroon blijven met de werkelijkheid.

**Why**: de gebruiker wil kunnen terugzien wat er wanneer is veranderd en hoe de huidige staat verhoudt tot de oorspronkelijke visie. Dit is de enige plek waar beide lagen (vision en reality) in één document zijn.

**How to apply**: na elke batch code-wijzigingen in een sessie, voor het einde van die sessie:
1. Check of de "Huidige staat"-sectie nog klopt met wat er werkelijk in de code staat
2. Voeg een changelog-entry toe (of breid de bestaande entry van die dag uit) onder "Recente wijzigingen"
3. Entries zijn korte bullet-style zinnen met prefix **Toegevoegd** / **Verbeterd** / **Gefixt** / **Verwijderd** / **Infrastructure** / **Documentatie**

De originele "vision"-secties (Doel, Functionaliteit met "Het concept" / "Hoe het werkt" / "Wat de app verder biedt" / multimedia-tabel) zijn door de gebruiker zelf geschreven en blijven **onaangeroerd** tenzij expliciet anders gevraagd. Alleen de "Overzicht", "Huidige staat", "Setup" en "Recente wijzigingen"-secties worden door mij onderhouden.
