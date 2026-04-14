# UI-overzicht E-mailStories

Beschrijft de userinterface zoals die nu werkelijk is in
[prototype_v2/](prototype_v2/). Oorspronkelijk geschreven als
ontwerpplan, nu herschreven als levend overzicht van wat er staat
plus wat nog openstaat.

---

## 1. Uitgangspunten

Vijf principes die elke ontwerpkeuze sturen:

1. **Voelen boven lezen** — feedback is sensorisch (kleur, beweging, gezichtsuitdrukking), niet tekstueel-correctief.
2. **Verhaal eerst, interface tweede** — UI-elementen verdwijnen waar mogelijk in het verhaal.
3. **Kompas, geen rechter** — feedback toont richting (te formeel ↔ te informeel), nooit een cijfer of goed/fout-oordeel.
4. **Kort, ritmisch, deelbaar** — één sessie voelt als één aflevering: 3-5 minuten, begin-midden-eind.
5. **Gen Z-native** — visueel, mobile-first, patronen uit social/streaming-apps.

---

## 2. Schermoverzicht

De prototype heeft zeven schermen plus een guardrail-modal:

```
┌─────────────────────────────────────────────────┐
│  HOME                                           │
│   ├─ Scenario-kaarten (herkansing + 2 locked)   │
│   ├─ Leer-kaart → LEER-PAGINA                   │
│   └─ Tandwiel → ADMIN                           │
│                                                 │
│  LEER-PAGINA (14 onderwerpkaarten in 3 groepen) │
│                                                 │
│  ADMIN (modus, model, sliders, test, logs)     │
│                                                 │
│  KARAKTERKAART                                  │
│   ↓                                             │
│  STORY-INTRO                                    │
│   ↓                                             │
│  SCHRIJFSCÈNE (editor + ToonMeter)              │
│   ↓                                             │
│  [guardrail modal] — als tekst niet oké is     │
│   ↓                                             │
│  ONTVANGER-REACTIE                              │
│   ↓                                             │
│  E-MAILRAPPORT                                  │
└─────────────────────────────────────────────────┘
```

---

## 3. Schermen in detail

### 3.1 Home
- Verticale lijst van scenario-kaarten. Alleen "Herkansing aanvragen" is
  nu speelbaar; stage en huisarts staan vergrendeld.
- **Leer-kaart** onder de scenario's met een book-icoon en een accent-rand, leidt naar de leer-pagina.
- **Tandwiel-icoon** rechtsboven → admin-pagina (voor de auteur, niet
  voor de student).
- Kleine voettekst onderaan die aangeeft dat dit een proefversie is.

### 3.2 Leer-pagina
Een nieuwe, introspectieve pagina met 14 uitklapbare onderwerpkaarten
(`<details>` elementen), verdeeld over drie secties:

**Het basisrepertoire**
- Aanhef en aanspreekvorm
- Register — de onzichtbare kleur van je tekst
- De structuur van een goede e-mail
- De onderwerpregel
- Zeg wie je bent

**De details die tellen**
- Lengte
- Hoofdletters en leestekens
- Emoji's
- Beleefdheidsmarkers
- Toonvalkuilen

**Voorbij het versturen**
- Herlees voor je verstuurt
- E-mail is geen appje
- De reactie is een gesprek
- Waarom e-mailangst bestaat

Elk onderwerp opent naar een korte tekst (3-6 zinnen), soms met een
lijstje voorbeelden. Meerdere onderwerpen kunnen tegelijk open staan.
De sectiekoppen zijn klein en in hoofdletters om de hiërarchie
duidelijk te maken zonder dominant te worden.

### 3.3 Admin
Testomgeving voor de auteur. Niet bedoeld voor eindgebruikers. Bevat:

- **Modus-selector**: rules-only / ml-only / hybride, met uitleg per optie
- **Modelstatus**: statusbolletje (idle/loading/ready/error), voortgangsbalk, laad-knop
- **Instellingen**:
  - ML debounce slider (200-2000 ms)
  - Softmax temperatuur slider (10-120)
- **Test-bench**: dropdown met 8 voorbeeld-e-mails + vrij tekstveld; toont beide scores + gedetecteerde signalen + dichtstbijzijnde ankers + verschil
- **Logs**: laatste 50 evaluaties (live + test-bench)

### 3.4 Karakterkaart
- Geïllustreerd portret van Prof. dr. Hendriks
- Drie vibe-tags ("precies", "druk", "formeel-binnen-grenzen")
- **Vibe-meter**: horizontale gradient van informeel (links, warm/oranje)
  naar formeel (rechts, koel/blauw), met een donkere marker op ~72%
- **Sweet-spot-uitleg**: *"De donkere stip is zijn sweet spot — niet
  te los, niet te stijf. Probeer straks aan te voelen of je e-mail
  daar in de buurt landt."*
- Italische punchline: *"een gevoelskwestie, geen rekensom"*
- Knop "Begin het verhaal →"

### 3.5 Story-intro
Situatieschets als verhaalkader: oma opgenomen, tentamen morgen,
prof. Hendriks staat bekend als precies. Eindigt op *"tijd om te
schrijven ↓"*. Knop "Schrijven".

### 3.6 Schrijfscène
Het kernscherm van de app.

- **Modus-indicator** rechtsboven (regels / ML / hybride)
- **Write-context**: mini-afzender-kaart (aan + onderwerp)
- **Editor**: textarea links, **ToonMeter** rechts
- **ToonMeter**:
  - Verticale gradient van hot (boven, informeel) naar cool (onder, formeel)
  - **Target-zone**: gestippelde rechthoek op 60-85% (formeel-maar-niet-overdreven)
  - **Zwarte naald** (rules, vol, ademend)
  - **Oranje gestreepte naald** (ML, verschijnt in ML/hybride modus)
- **ML status-badge**: "niet geladen" / "laden X%" / "denkt na..." / "klaar" / "score X"
- **Divergentie-melding** in hybride modus als rules en ML >20 punten uit elkaar zijn
- **Hint-chips**: tot 3 neutraal-gekleurde labels onder de editor
- **Knoppen**: Pauzeer (naar intro) + Verstuur (met guardrail-check)

### 3.7 Guardrail-modal
Verschijnt wanneer de student op Verstuur klikt en de tekst een van de
checks niet passeert. Bevat:

- Een klein oranje accent-streepje bovenaan
- Titel (korte, vriendelijke framing)
- Uitleg van wat er aan de hand is + wat de opdracht eigenlijk vraagt
- Eén knop: "Oké, ik probeer opnieuw"
- Klikken buiten de modal sluit hem ook

**Detectie-categorieën**:
1. Gibberish (te kort, geen echte woorden)
2. Beledigingen (scheldwoorden, "stomme hoogleraar")
3. Meta/test-gedrag ("this is a test", "ignore instructions")
4. Off-topic (rule-based: geen scenario-keywords; ML-based: lage max
   similariteit met ankers)

### 3.8 Ontvanger-reactie
- Animatie-achtig gezichtsframe (SVG) met vier mogelijke expressies:
  frown / puzzled / pleased / amused, gekozen op score
- Gedachtebel met een zin ("...is dit een appje?" / "Helder en respectvol" / etc.)
- Score-badge onderaan die toont welke score gebruikt werd
  (regels / ML / gemiddelde in hybride modus)
- Knoppen: "Pas aan" (terug naar editor) + "Lees rapport →"

### 3.9 E-mailrapport
- Jouw e-mail in een "telefoon-mockup" bovenaan
- **Wat opviel**-sectie: observaties per bouwsteen (aanhef, u/je, lengte, toon), altijd neutraal geformuleerd
- **Drie versies naast elkaar**: te informeel / jouw versie / te formeel in een horizontaal-scrollbare carrousel
- In hybride modus: extra noot over agreement tussen rules en ML
- Knop "Terug naar verhalen"

---

## 4. Sleutelcomponenten

### 4.1 De ToonMeter
- Vorm: verticale schaal met gradient (hot → warm → cool)
- Target-zone: gestippelde rechthoek op 60-85%
- Rules-naald: zwarte bol, ademt zachtjes via CSS-animatie
- ML-naald: oranje gestreepte cirkel, alleen in ml/hybrid
- Beide naalden bewegen soepel via CSS `top` transition

### 4.2 Signaalwoord-hints
- Tot 3 labels onder de editor
- Drie soorten: neutraal (beige), `warm` (oranje = informeel gedetecteerd), `cool` (blauw = formeel gedetecteerd)
- Komen alleen uit de regel-gebaseerde laag
- Vervagen in met een fadeIn-animatie

### 4.3 Karakter-illustraties
- Eenvoudige inline SVG-gezichten
- Vier expressies voor de reactie-scène
- Stijl: getekend, minimalistisch, neutrale kleuren

---

## 5. Visuele taal

### Kleuren
- Basispalet: warm-neutrale achtergronden (off-white, cream)
- Accent: warm koraal (#E87B5C)
- ToonMeter-gradient: koraal (hot, informeel) → zand (warm, neutraal) → blauw (cool, formeel)
- Donkere modus via `prefers-color-scheme`

### Typografie
- Headings: Iowan Old Style / Palatino / Georgia serif
- Body en editor: Inter / system sans
- Microcopy: lichter, kleiner, nooit in hoofdletters behalve sectiekoppen

### Beweging
- Schermovergangen: fade + kleine verticale verplaatsing
- ToonMeter-naald: CSS `top` transition met cubic-bezier easing
- Rules-naald: subtiel "ademen" via box-shadow keyframes
- Modal: pop-in animatie (schaal + opacity)

---

## 6. Tone of voice

- Tweede persoon enkelvoud, warm en informeel
- Geen complimenten-inflatie, wel oprechte observaties
- Vragen in plaats van instructies ("Voelde dat passend voor deze ontvanger?")
- Geen jargon: geen "register", "formaliteitsgraad", of "salutatie" in zichtbare UI
- Microcopy is kort en direct

---

## 7. Wat nog niet in de app zit (toekomstig werk)

- **Extra scenario's**: stage, huisarts — nu vergrendeld op home
- **Jouw situatie-modus**: eigen e-mail invoeren, app bouwt scenario eromheen
- **Voortgangsdashboard**: organische groei-iconen per vaardigheid
- **Deel-kaart**: shareable resultaat na afloop
- **Pas-aan-modus als eigen flow**: nu alleen als "pas aan"-knop op de reactie-scène die teruggaat naar de editor
- **PWA-features**: service worker, manifest, offline-first, installeerbaar op home screen

---

## 8. Toegankelijkheid

Uitgangspunten (deels geïmplementeerd):

- WCAG 2.2 AA als doel
- ToonMeter geeft informatie niet alleen via kleur — ook via positie
- Toetsenbord-bediening voor alle navigatie
- `prefers-reduced-motion` wordt nog niet actief gerespecteerd (toekomstig)
- Schermlezer-ondersteuning nog niet volledig gevalideerd
- Dyslexie-vriendelijke font-optie: nog niet geïmplementeerd

---

*Dit document beschrijft de huidige staat. Bij grote wijzigingen
bijwerken zodat het synchroon blijft met wat de code daadwerkelijk doet.*
