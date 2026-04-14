# Bel-oefening — Roadmap

**Datum:** april 2026  
**Status:** prototype v20

---

## Fase 1 — Stabilisatie & veiligheid (kort termijn)

### 1.1 Backend token service
**Prioriteit:** hoog  
**Reden:** API-sleutel niet client-side opslaan bij gebruik door studenten

De OpenAI API-sleutel hoort niet in de browser. Oplossing: een kleine backend (Node.js of Python/FastAPI) die als token-proxy fungeert:

```
Browser → POST /api/token  →  Backend → OpenAI /v1/realtime/sessions
                           ←  { ephemeral_token }
```

De backend authenticeert de student (bijv. via VU SSO/OAuth), vraagt een ephemeral token aan bij OpenAI, en geeft alleen dat tijdelijke token terug aan de browser. De OpenAI API-sleutel blijft server-side.

### 1.2 HTTPS deployment
**Prioriteit:** hoog  
**Reden:** `getUserMedia` vereist HTTPS buiten localhost

Opties: Azure Static Web Apps, VU-hosting, of een simpele Flask/FastAPI app op een VU-server.

### 1.3 Sessie-logging
**Prioriteit:** medium  
**Reden:** onderzoeksdata verzamelen

Sla per gesprek op: scenario, moeilijkheidsgraad, gespreksduur, aantal beurten, AI-score, timestamp. Minimale backend met database (SQLite of MongoDB) voldoende voor het prototype.

---

## Fase 2 — Onderzoeksfunctionaliteit (middellange termijn)

### 2.1 Voortgangsopslag per student
Studenten kunnen terugkomen en zien hoe hun scores zich ontwikkelen over tijd. Vereist authenticatie (VU-netwerk ID of eenvoudige token).

Weergave: simpele grafiek van AI-scores over sessies heen — zichtbaar verschil is motiverend voor exposure-therapie.

### 2.2 Scenario-selectie door docent
Docenten kunnen via een beheerinterface instellen welke scenario's beschikbaar zijn voor een specifieke groep studenten, en met welke moeilijkheidsgraad gestart wordt.

### 2.3 Uitgebreidere feedbackdimensies
De huidige AI-feedback geeft één score. Uitbreiding naar meerdere dimensies:

- **Duidelijkheid** — was het doel van het gesprek helder?
- **Beleefdheid** — was de toon gepast?
- **Zelfverzekerdheid** — klonk de student zeker?
- **Efficiëntie** — werd het doel bereikt zonder omwegen?

Weergave als radar/spinnenwebgrafiek.

### 2.4 Nieuwe scenario's
Uitbreidingen op basis van studentenfeedback:

- Gemeente/loket (bijstandsuitkering, verhuizing)
- Bank/verzekering
- Werkgever (ziekmelden, roosterwijziging)
- Woningcorporatie
- Belastingdienst

Scenario's kunnen door onderzoekers worden toegevoegd via een JSON-configuratiebestand, zonder code te wijzigen.

### 2.5 Eigen scenario uploaden
Docenten kunnen een nieuw scenario definiëren via een formulier: naam, omschrijving, karakterbeschrijving, context, moeilijkheidsgraad-modifiers. Scenario wordt lokaal of server-side opgeslagen.

---

## Fase 3 — Integratie in omvattender systeem (lange termijn)

### 3.1 Inbedding als iframe/module
De applicatie is al gerefactord met een config-laag (`config.js`) en een publieke API (`window.BelOefening`). Dit maakt inbedding in een groter platform mogelijk:

```javascript
// Vanuit omvattend systeem:
BelOefening.init({
  scenario: 'studiesecretariaat',
  difficulty: 'medium',
  onComplete: (result) => {
    // result: { score, duration, turns, transcript, feedback }
    platform.saveResult(result);
  }
});
```

### 3.2 LTI-integratie (Canvas/Brightspace)
Via LTI 1.3 kan de oefening als externe tool worden ingebed in een bestaande leeromgeving. Studenten starten de oefening vanuit Canvas, resultaten stromen terug als cijfer of activiteit.

### 3.3 Onderzoeksexport
Exportfunctie voor onderzoekers: CSV of JSON met geanonimiseerde gespreksdata voor kwalitatieve analyse of het trainen van betere feedbackmodellen.

### 3.4 Multimodale feedback
Aanvullend op tekstfeedback: automatische analyse van spreeksnelheid, pauzelengtes, en stemtoon via de audio-data. Vereist toegang tot de ruwe audiostream.

### 3.5 Peer-review modus
Twee studenten horen elkaars opgenomen gesprek en geven feedback via de bestaande feedbackstructuur. Toevoeging van een sociaal element aan de oefening.

---

## Technische schuld / bekend werk

| Item | Urgentie | Beschrijving |
|---|---|---|
| API-sleutel client-side | hoog | Vervangen door backend token service |
| Geen foutafhandeling bij netwerkverlies | medium | WebRTC verbinding kan stilvallen zonder melding |
| Transcript niet persisteerbaar | medium | Pagina sluiten = data weg |
| Whisper taalslot hardcoded | laag | Configureerbaar maken |
| Geen accessibility audit | medium | Screenreader, contrast, toetsenbordnavigatie |
| Geen unit tests | laag | Feedbackparser en state machine zijn testbaar |
