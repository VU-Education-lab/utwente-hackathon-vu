# Ontwerp-overwegingen

Forward-looking design notes: observaties en spanningen om over na te
denken bij volgende iteraties. Dit zijn geen beslissingen, maar dingen
die aandacht verdienen op het moment dat een bepaald onderdeel echt
wordt uitgewerkt.

Nieuwe entries bovenaan. Elke entry beschrijft: *wat er opviel*, *waarom
het ertoe doet*, en *welke implicaties het heeft voor later*.

---

## 2026-04-09 — Scenario-ontwerp en twee-varianten-opzet

Bij het toevoegen van zes nieuwe scenario-placeholders op het home-scherm
kwamen vier overwegingen naar boven die we nu vastleggen voor wanneer
we de scenario's daadwerkelijk gaan uitwerken.

### 1. De pedagogische waarde van de twee-varianten-opzet

**Observatie**: elk scenario in twee varianten aanbieden — één met een
heel formele hoogleraar en één met een vrij informele — is sterker dan
het lijkt. Het maakt register tastbaar op een manier die één scenario
niet kan.

**Waarom het ertoe doet**: Het is dezelfde boodschap, dezelfde student,
dezelfde ernst — alleen een andere ontvanger, en de hele e-mail moet
meebewegen. Dát is precies wat de app wil leren: dat register geen
vaste regel is maar een aanpassing aan de persoon tegenover je. Een
student die alleen de formele variant doet kan aan de oppervlakte
denken: "dus voor een hoogleraar moet ik altijd 'Geachte' schrijven".
Een student die beide doet en merkt dat de informele variant een
andere toon vraagt, leert de onderliggende vaardigheid.

**Implicatie**: investeer bij het uitwerken van een scenario altijd in
*beide* varianten tegelijk. Niet één eerst bouwen en de andere "later"
— de contrast-ervaring is de les. Bij de karakterkaart na scenario-
keuze komt dan een tweede stap: "welke ontvanger?", met twee profielen
naast elkaar.

### 2. De twee "moeilijke" scenario's verdienen speciale aandacht

**Observatie**: twee van de nieuwe scenario's zijn pedagogisch bijzonder
waardevol maar technisch lastig — "waar is het tentamen" (door docenten
gezien als vervelende vraag) en "oninteressant college melden" (sociaal
complex).

**Waarom het ertoe doet**: deze scenario's bevatten sociale complexiteit
die *niet* door register-scoring gevangen wordt. "Je stelt een vraag
waar je het antwoord zelf kunt vinden in de studiehandleiding" is geen
registerprobleem — het is een inhoudelijk/pragmatisch probleem. Een
perfect geformuleerde vraag in het juiste register kan alsnog
ongepast zijn omdat de student had moeten zoeken. Onze huidige rules
+ ML-aanpak kan dit niet zien.

**Implicaties voor later**:

- Scenario-specifieke guardrails — bijvoorbeeld: heeft de student in
  de e-mail erkend dat de informatie mogelijk al ergens staat?
  ("Ik heb in de studiehandleiding gekeken maar kon het niet vinden")
- Ontvanger-reacties die de inhoudelijke kant oppakken — een docent
  die antwoordt "dit staat op pagina 3 van de studiehandleiding" is
  op zichzelf al een leermoment, ook al was de toon prima
- Of accepteer dat sommige scenario's gewoon over *meer* gaan dan
  register alleen, en gebruik ze om de student bewust te maken van die
  tweede dimensie (inhoudelijke gepastheid)

Voor de moeilijkste van de twee — *oninteressant college melden* — is
de uitdaging nog groter: je geeft negatieve feedback aan een
autoriteitsfiguur. Dit vraagt diplomatie, niet alleen register. Een
goed geformuleerde e-mail hier is bijna een kunstwerk. Dit scenario
zou kunnen dienen als een soort "final boss" in een
vaardigheidsprogressie — iets dat de student pas echt kan na de
andere eerst.

### 3. Anker-corpus schaalt niet lineair

**Observatie**: met 7 scenario's × 2 ontvangers × ~6 ankers per ontvanger
kom je op ~84 anker-zinnen om te schrijven, valideren en onderhouden.
Dat is meer dan een middag werk.

**Waarom het ertoe doet**: de huidige hybride scoring leunt op ankers
die per scenario anders zijn. Zonder goede ankers werkt het ML-model
niet voor dat scenario. Maar ankers handmatig schrijven voor elk nieuw
scenario is een bottleneck.

**Implicaties voor later**:

- Begin bij het opschalen met een gestructureerde anker-workflow,
  niet ad-hoc. Zie [corpus_plan.md](corpus_plan.md) voor het plan
- Overweeg of sommige ankers gedeeld kunnen worden over scenario's
  (bv. "zeer informeel aanhef"-variatie), of dat dat de contrastieve
  centrering verpest omdat die nu juist op scenario-specifieke
  topic-drift rekent
- De leer-pagina en de scenario-kaart moeten niet wachten op alle
  ankers — de ervaring kan beginnen zelfs als het ML-scoring op
  een nieuw scenario nog niet geoptimaliseerd is
- Bij drie of meer scenario's ingebouwd: dan is het corpus-runner-
  stappenplan uit corpus_plan.md écht waardevol, want dan kun je de
  scorers systematisch testen

### 4. Klachtenprocedure is categorisch anders

**Observatie**: de klachtenprocedure-scenario is de enige waar de
student zich tot een *institutie* richt, niet een persoon. Dat
verandert meer dan het lijkt.

**Waarom het ertoe doet**:

- Geen "u" gericht op één iemand, maar op een college
- Andere conventies voor onderbouwing (feiten, data, referenties)
- Vaak bijlagen en een gestructureerd format
- Geen "twee varianten" — een klacht is inherent formeel, informele
  variant bestaat niet echt
- Het gaat minder om *register* en meer om *zakelijk schrijfwerk*

**Implicatie**: dit scenario is eigenlijk geen E-mailStory in dezelfde
zin als de andere. Het past minder goed bij de narratieve,
gevoel-gedreven opzet. Drie opties voor wanneer we er naartoe werken:

1. **Aparte behandeling**: bouw een mini-flow speciaal voor dit type
   — geen ToonMeter (niet relevant), maar wel structuur-checks, een
   sjabloon, en feedback op onderbouwing
2. **Weglaten uit E-mailStories** en positioneren als een toekomstig
   apart module of app ("Zakelijke brieven schrijven") — passend
   omdat het een andere vaardigheid is
3. **Omvormen**: richten aan de studieadviseur of examencommissie-
   voorzitter als persoon, niet als instituut. Dat maakt het terug een
   persoon-tot-persoon scenario en past bij de rest

Ik denk optie 3 is het meest elegant, omdat het de consistency van de
app behoudt en tegelijkertijd de belangrijke vaardigheid (moeilijke
gesprekken met gezag) oefent. Maar het vraagt wel dat we de rol
"studieadviseur / vertrouwenspersoon" uitwerken, niet een vage
commissie.

---

*Dit document wordt aangevuld wanneer nieuwe ontwerp-spanningen naar
boven komen. Bij structurele wijzigingen ook doorlinken vanuit
[project.md](project.md) en mijn memory-notitie.*
