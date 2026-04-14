# Corpus-aanpak E-mailStories

Notitie voor later. Beschrijft hoe we een corpus voor één casus zouden
opzetten, waarom, en wat de stappen zijn. Niet gebouwd — alleen vastgelegd
zodat we kunnen beginnen op het moment dat het relevant wordt.

---

## 1. Waarom een corpus

Een corpus in deze context is een **verzameling voorbeeld-e-mails**, elk
voorzien van een door een mens toegekende score of categorie. Het is de
"gouden standaard" waartegen je de scoring-lagen van de app kunt
aftesten, tunen, en uiteindelijk trainen.

Zonder corpus weet je niet of je regels of ML beter worden of slechter
als je iets verandert. Met corpus kun je dat meten — en kun je gericht
beslissingen nemen over wat wel en niet werkt. Het corpus wordt daarmee
het belangrijkste stukje ontwerpinfrastructuur voor de scoring-lagen.

---

## 2. Vier mogelijke doelen van een corpus

Belangrijk om eerst helder te hebben, want het bepaalt alles wat erna
komt:

1. **Test-corpus** — om te meten hoe goed de huidige scorers presteren.
   Je draait de regels en ML erop en vergelijkt met de menselijke score.
   Vraag die het beantwoordt: *"hoe vaak zitten mijn scorers in de buurt
   van wat een mens zou vinden?"*

2. **Anker-corpus** — om betere anker-zinnen te kiezen voor het ML-model.
   De huidige ankers (zes stuks, zelfbedacht) zijn vertrekpunten. Met
   een corpus kun je echte voorbeelden per niveau vinden en de beste
   eruit selecteren als ankers.

3. **Trainings-corpus** — alleen nodig als je ooit een classifier wilt
   fine-tunen. Veel groter (honderden tot duizenden voorbeelden), duur
   om te maken.

4. **Feedback-corpus** — verzamelde student-responses (geanonimiseerd)
   uit echte sessies, om te leren wat ze daadwerkelijk schrijven. Kan
   pas als er studenten zijn.

**Voor de huidige fase** is doel 1 (test-corpus) verreweg het
belangrijkst, met een bijkomend effect voor doel 2. Daar zou ik op
beginnen.

---

## 3. Schaal voor de huidige fase

Voor één casus (bv. hoogleraar/herkansing) zou ik **60-80 voorbeelden**
als eerste doel nemen. Dat is:

- **Klein genoeg** om handmatig te maken en te valideren in enkele uren
- **Groot genoeg** om statistisch iets te kunnen zeggen (10-15 per
  niveau, verspreid over ~6 niveaus)
- **Uitbreidbaar** zodat je er later bij kunt voegen wanneer je nieuwe
  edge cases tegenkomt

---

## 4. Structuur van een corpus-entry

Elk voorbeeld is een JSON-object. Voorgestelde velden:

```json
{
  "id": "HK-017",
  "text": "Geachte heer Hendriks, helaas kan ik morgen...",
  "expected_score": 75,
  "expected_band": "formeel",
  "notes": "Correcte aanhef, consequente u-vorm, duidelijke context en verzoek, nette afsluiting. Ligt rond het gekalibreerde midden voor deze ontvanger.",
  "tags": ["aanhef-geachte", "u-vorm", "verzoek-duidelijk", "afsluiting-formeel"],
  "edge_case": null,
  "source": "auteur"
}
```

Uitleg per veld:

| Veld | Functie |
|---|---|
| `id` | Stabiele identifier om naar dit voorbeeld te verwijzen |
| `text` | De volledige e-mail-tekst |
| `expected_score` | Een getal 0-100 (past bij de interne schaal van de app) |
| `expected_band` | Categorie — makkelijker consequent te labelen dan een getal |
| `notes` | Paar zinnen waarom dit voorbeeld op dit niveau zit. Cruciaal voor bijstelling later |
| `tags` | Gestandaardiseerde labels voor wat er in staat |
| `edge_case` | Optioneel: wat maakt dit voorbeeld moeilijk? |
| `source` | Waar komt de tekst vandaan? (auteur, aangepast, student, LLM) |

---

## 5. Labelingsrubriek

Labelen is de hardste stap. Mensen zijn inconsistent, vooral bij
fijnzinnige onderscheiden. Daarom: label primair op **categorie**
(makkelijker), met een optionele fine-grained score binnen elk bereik.

| Niveau | Score | Markers |
|---|---|---|
| **Zeer informeel** | 0-15 | Geen of losse aanhef ("yo", "hey"), veel spreektaal, emoji's, geen hoofdletters, afsluiting afwezig of "x" |
| **Informeel** | 16-35 | "Hoi" of geen aanhef, "je"-vorm, milde spreektaal, korte losse afsluiting |
| **Informeel-net** | 36-55 | "Hallo meneer X", netjes maar informeel, geen emoji's, afsluiting "groeten" |
| **Neutraal-beleefd** | 56-70 | "Beste meneer X", consequent "u", duidelijk verzoek, "met vriendelijke groet" |
| **Formeel** | 71-85 | "Geachte heer X", beleefdheidsmarkers ("zou u", "mocht"), duidelijke structuur, voldoende context |
| **Zeer formeel** | 86-100 | "Hooggeachte", titels opgestapeld, archaïsche formuleringen, "hoogachtend" of overdreven afsluitingen |

**Consistentie-tip**: label in batches van ~10, en label een willekeurige
20% een tweede keer enkele dagen later zonder naar je eerdere labels te
kijken. Als je anders labelt dan de eerste keer → de rubriek is niet
scherp genoeg. Dit is "self-agreement" als goedkope vervanging voor
inter-rater reliability.

---

## 6. Hoe aan voorbeelden te komen

Vier opties, van minst tot meest authentiek:

1. **Zelf schrijven** — snel, consistent, maar de eigen stijl lekt erin.
   Je ziet ook alleen fouten die je zelf kunt voorstellen.

2. **Genereren met een LLM** — snel, geeft variatie, maar LLM's hebben
   eigen stijl-artifacten die onbedoelde bias kunnen introduceren.

3. **Adapteren uit tekstboeken/voorbeelden** — bruikbaar voor formele
   voorbeelden, zelden voor de informele kant (tekstboeken tonen zelden
   wat Gen Z echt schrijft).

4. **Verzamelen van echte studenten** — meest waardevol maar duurt
   weken, vereist toestemming, en is pas haalbaar als er studenten zijn.

**Aanbeveling voor de start**: een **hybride** — Claude genereert 2-3
kandidaten per niveau per variant, auteur reviewt en houdt de beste, en
voegt 30% zelfgeschreven voorbeelden toe voor authenticiteit. Later
vervangen door echte studenttekst zodra die beschikbaar is.

---

## 7. Coverage en balans

Niet alleen "10 per niveau" is belangrijk, maar ook variatie binnen elk
niveau. Denk aan:

- **Lengte-variatie** — korte en lange varianten van hetzelfde register
- **Structuur-variatie** — met/zonder subject, met/zonder context
- **Verstoringen** — wat als een formele e-mail één emoji bevat? wat
  als een informele e-mail ineens "Geachte" gebruikt?
- **Edge cases** — grensgevallen (niveau 55-60), gemengde registers,
  passief-agressieve toon
- **Near-miss** — emails die bijna goed zijn maar op één punt afwijken

Deze laatste categorie is de meest waardevolle voor tuning: de
voorbeelden die je op het randje zetten zijn de voorbeelden die je
scorers moeten kunnen onderscheiden.

---

## 8. Hoe Claude kan helpen (gerangschikt op waarde)

1. **Corpus-structuur opzetten** — een bestand
   `corpus/hoogleraar_herkansing.json` aanmaken met de velden en een
   paar seed-voorbeelden

2. **Seed-corpus genereren** — Claude schrijft 40-50 kandidaat-
   voorbeelden verspreid over de zes niveaus, met voorgestelde scores
   en tags. Auteur reviewt en past aan waar nodig (auteur is de
   definitieve rechter van de labels)

3. **Coverage-checker** — een klein script dat de verdeling van het
   corpus toont en gaten identificeert ("0 voorbeelden met gemengd
   register", "geen korte formele voorbeelden")

4. **Corpus-runner in de admin-pagina** — een extra tab die het hele
   corpus door rules en ML jaagt en toont: per entry de verwachte score,
   rules-score, ML-score, verschil, en of het wel/niet in het verwachte
   bereik valt. Tabel waar je in één oogopslag ziet waar de scorers goed
   of verkeerd zitten

5. **Tuning op basis van corpus-resultaten** — als blijkt dat bepaalde
   typen emails systematisch verkeerd scoren: gerichte aanpassingen
   (regel toevoegen, anker vervangen, temperatuur bijstellen)

6. **Corpus-schrijver-workflow** — een klein admin-tool waar auteur
   nieuwe voorbeelden kan toevoegen met een formulier, ze live laten
   scoren, en het label aanpassen. Lagere drempel dan JSON-bewerken

---

## 9. Wat bewust niet te doen in deze fase

- **Meteen een trainings-corpus** (duizenden voorbeelden) bouwen — veel
  te veel werk voordat je weet of het helpt
- **Inter-rater labeling met meerdere mensen** — nu niet, één annotator
  is prima voor een eerste iteratie
- **Automatische labeling door een LLM** — dat introduceert exact de
  bias die je probeert te meten. Menselijke labels zijn de gouden
  standaard
- **Uitbreiden naar meerdere scenario's tegelijk** — eerst één scenario
  goed krijgen voordat je de structuur voor N scenario's optuigt

---

## 10. Concrete eerste stap wanneer we beginnen

1. Claude maakt het corpus-bestand aan met de JSON-structuur hierboven
2. Claude genereert 30-40 kandidaat-voorbeelden, gebalanceerd over de
   zes niveaus, met voorgestelde scores, notes en tags
3. Auteur gaat erdoorheen en past aan waar nodig (dit is de kwaliteits-
   stap die niet over te slaan is)
4. Resultaat: een werkbaar startcorpus na één sessie
5. Daarna: de corpus-runner in admin, zodat het corpus direct gebruikt
   kan worden om de huidige rules + ML te evalueren

---

## 11. Open vraag voor wanneer we beginnen

Zijn de voorbeelden allemaal gericht op exact het hoogleraar/herkansing-
scenario dat nu in de app zit (consistent met de huidige ankers), of
wil je variatie in het scenario (andere redenen voor afwezigheid, andere
tentamens) om te testen hoe robuust de scorers zijn voor
onderwerp-variatie?

Beide kunnen, maar de keuze bepaalt wat je meet:

- **Strikt één scenario** → meet puur register-detectie, consistent met
  de huidige opzet
- **Variatie in onderwerp** → meet ook topic-robustness van de ML-laag,
  nuttig omdat de contrastieve centrering juist gevoelig is voor hoe
  veel onderwerp-overlap de ankers hebben
