# Bel-oefening

AI-gestuurde telefoonoefening voor studenten met bel-angst.  
VU Education Lab — april 2026

---

## Vereisten

- Python 3.8 of hoger
- Een moderne browser (Chrome, Edge, Safari 15+, Firefox 85+)
- Een OpenAI API-sleutel (begint met `sk-`)

Haal een sleutel op via: https://platform.openai.com/api-keys

---

## Installatie

Geen installatie nodig. Download of clone de map en ga erin:

```bash
cd bel-oefening-app
```

---

## Server starten

```bash
python3 server.py
```

De server draait nu op **http://localhost:8080**

Stop de server met `Ctrl+C`.

> **Waarom een server?**  
> De browser staat microfoon-toegang (`getUserMedia`) alleen toe op `localhost` of `https://`. Dubbelklikken op `index.html` werkt daarom niet.

---

## App openen

Open je browser en ga naar:

```
http://localhost:8080
```

---

## Eerste keer gebruiken

1. Voer je OpenAI API-sleutel in (begint met `sk-`)
2. Klik **Beginnen →**
3. De sleutel wordt opgeslagen in je browser — volgende keer hoef je hem niet opnieuw in te voeren

---

## Gesprek oefenen

1. Je krijgt een willekeurig scenario te zien (bijv. huisartsenpraktijk, studiesecretariaat)
2. Kies een moeilijkheidsgraad: 😊 Rustig / 😐 Normaal / 😰 Pittig
3. Klik **📞 Start gesprek**
4. Klik **📞 Bellen** om de verbinding op te zetten
5. **Houd de microfoonknop ingedrukt** terwijl je spreekt, laat los als je klaar bent
6. Op desktop werkt ook de **spatiebalk** als push-to-talk
7. Klik **Gesprek beëindigen** als je klaar bent

Na afloop zie je de gespreksduur, het transcript, en kun je AI-feedback opvragen.

---

## Projectstructuur

```
bel-oefening-app/
├── index.html                  — HTML + CSS (geen inline logica)
├── app.js                      — Alle applicatielogica (ES module)
├── scenarios.js                — Scenario- en moeilijkheidsgraad-definities
├── config.js                   — Configureerbare parameters (endpoints, modellen)
├── server.py                   — Lokale HTTP server (Python)
├── README.md                   — Dit bestand
├── TECHNISCHE_DOCUMENTATIE.md  — Architectuur, data flows, API-beschrijving
└── ROADMAP.md                  — Geplande uitbreidingen
```

---

## Integratie in een omvattend systeem

De app exporteert een publieke API via `window.BelOefening`:

```javascript
// Optioneel: stel scenario en moeilijkheidsgraad in vanuit het omvattende systeem
window.BelOefening.setScenario('huisarts');
window.BelOefening.setDifficulty('medium');

// Start de app
window.BelOefening.init();

// Ontvang resultaat na afloop
window.BelOefening.onComplete = (result) => {
  console.log(result);
  // result: { scenario, difficulty, score, feedback, duration, turns, transcript }
};
```

---

## Problemen oplossen

**Microfoon werkt niet**  
→ Controleer of de browser toestemming heeft voor microfoon. In Chrome: klik op het slotje in de adresbalk.

**"API fout 401"**  
→ De OpenAI sleutel is ongeldig of verlopen. Klik op "Andere API-sleutel" en voer een nieuwe in.

**"Failed to fetch" bij feedback**  
→ Controleer je internetverbinding. De feedback gebruikt dezelfde OpenAI sleutel als het gesprek.

**Pagina laadt niet**  
→ Controleer of `python3 server.py` actief is in de terminal. Ga naar http://localhost:8080, niet naar het bestand zelf.

**Gesprek start niet / blijft hangen bij "Verbinden…"**  
→ Controleer of je OpenAI account actief is en voldoende tegoed heeft op https://platform.openai.com/usage
