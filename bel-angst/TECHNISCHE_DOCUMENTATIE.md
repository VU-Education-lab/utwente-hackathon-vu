# Bel-oefening — Technische documentatie

**Versie:** v20  
**Datum:** april 2026  
**Project:** VU Education Lab — bel-angst onderzoek  

---

## Overzicht

Bel-oefening is een browser-gebaseerde webapplicatie waarmee studenten telefoongesprekken kunnen oefenen met een AI-gesprekspartner. De applicatie draait volledig client-side en maakt gebruik van de OpenAI Realtime API via WebRTC voor spraak-naar-spraak communicatie in real-time.

---

## Architectuur

```
Browser
  │
  ├── HTML/CSS/JS (single-file of losse bestanden)
  │     ├── Scherm 1: Setup        (API-sleutel invoer)
  │     ├── Scherm 2: Briefing     (scenario + moeilijkheidsgraad + ademhaling)
  │     ├── Scherm 3: Gesprek      (PTT, ringtone, live transcript)
  │     └── Scherm 4: Reflectie   (stats, transcript, AI-feedback, score-slider)
  │
  ├── OpenAI Realtime API (WebRTC)
  │     ├── POST /v1/realtime/sessions  → ephemeral token
  │     └── POST /v1/realtime?model=…  → SDP exchange (WebRTC)
  │
  └── OpenAI Chat Completions API
        └── POST /v1/chat/completions  → AI-feedback (gpt-4o-mini)
```

---

## Technische stack

| Component | Technologie |
|---|---|
| Runtime | Browser (vanilla JS, geen frameworks) |
| Audio transport | WebRTC (RTCPeerConnection) |
| AI gesprekspartner | OpenAI Realtime API (gpt-4o-realtime-preview) |
| Transcriptie | Whisper-1 via OpenAI Realtime datakanaal |
| AI-feedback | OpenAI Chat Completions (gpt-4o-mini) |
| Audio synthesizer | Ringtone via Web Audio API (geen externe bestanden) |
| Opslag | localStorage (API-sleutel) |
| Server | Python http.server (development) |

---

## Authenticatie

De applicatie gebruikt een OpenAI API-sleutel die de gebruiker eenmalig invoert. De sleutel wordt opgeslagen in `localStorage` onder de key `oai_key`.

**Beveiligingsopmerking:** Het opslaan van een API-sleutel in localStorage is geschikt voor lokaal gebruik en prototyping, maar niet voor productie-deployment waarbij meerdere onbekende gebruikers de applicatie gebruiken. Zie de Roadmap voor de backend-token-service aanpak.

---

## Screens en state machine

```
[Setup] ──startSession()──► [Briefing] ──goToCall()──► [Gesprek] ──endCall()──► [Reflectie]
                                 ▲                                                     │
                                 └───────────────nextRound()────────────────────────────┘
```

### Screen: Setup
- Controleert of `oai_key` aanwezig is in localStorage
- Zo ja: sla Setup over en ga direct naar Briefing
- Valideert dat de sleutel begint met `sk-`

### Screen: Briefing
- Kiest willekeurig een scenario uit `SCENARIOS[]`
- Toont moeilijkheidsgraad-knoppen (easy / medium / hard)
- Start ademhalingsoefening (4-4-4 box breathing)
- Geeft een contextuele tip

### Screen: Gesprek
- Haalt een ephemeral token op via `/v1/realtime/sessions`
- Bouwt een WebRTC verbinding op via SDP exchange
- Opent een DataChannel (`oai-events`) voor events
- Push-to-Talk: microfoon aan tijdens indrukken, uit bij loslaten
- Spacebar werkt als PTT op desktop
- Whisper-transcriptie van gebruiker én AI via DataChannel events
- Ringtone via Web Audio API (geen externe bestanden)

### Screen: Reflectie
- Toont gespreksduur en aantal beurten
- Transcript uitklapbaar
- AI-feedback knop: stuurt transcript naar GPT-4o-mini, ontvangt JSON met score + feedback
- Score-slider animeert naar de AI-score (0.0–1.0, rood=slecht links, blauw=goed rechts)

---

## Data flow: WebRTC gesprek

```
1. answerCall()
   │
   ├── POST /v1/realtime/sessions
   │     body: { model, voice, instructions }
   │     → { client_secret: { value: <ephemeral_token> } }
   │
   ├── navigator.mediaDevices.getUserMedia({ audio: true })
   │     → audioTrack (initieel disabled)
   │
   ├── RTCPeerConnection()
   │     ├── addTrack(audioTrack)
   │     ├── createDataChannel('oai-events')
   │     └── createOffer() → localDescription
   │
   └── POST /v1/realtime?model=gpt-4o-realtime-preview-2024-12-17
         headers: Authorization: Bearer <ephemeral_token>
         body: offer.sdp (Content-Type: application/sdp)
         → answer.sdp → setRemoteDescription()

2. DataChannel open
   │
   ├── session.update: { turn_detection: null, input_audio_transcription: { model: 'whisper-1', language: 'nl' } }
   └── response.create  (AI spreekt als eerste)

3. PTT actief
   ├── audioTrack.enabled = true
   ├── input_audio_buffer.clear
   ├── [gebruiker spreekt]
   ├── audioTrack.enabled = false
   ├── input_audio_buffer.commit
   └── response.create

4. Inkomende events (handleEvent)
   ├── response.audio.delta        → avatar animatie: speaking
   ├── response.audio.done         → avatar animatie: idle
   ├── response.audio_transcript.delta  → live AI tekst in transcript
   ├── response.audio_transcript.done   → AI beurt afsluiten
   └── conversation.item.input_audio_transcription.completed → gebruiker tekst in transcript
```

---

## Data flow: AI-feedback

```
requestFeedback()
│
├── Transcript ophalen uit DOM (transcriptMsgs)
│     → array van { who, text } → joined als "Wie: tekst\n..."
│
├── POST https://api.openai.com/v1/chat/completions
│     model: gpt-4o-mini
│     prompt: scenario + moeilijkheidsgraad + transcript + JSON-instructie
│
└── Response JSON:
      {
        "score": 0.75,          // 0.0–1.0
        "goed": ["label1", ...], // positieve punten (pills)
        "overkwam": "tekst",    // hoe de student overkwam
        "ongemak": "tekst|null",// ongemakkelijke momenten
        "tip": "tekst"          // één concrete tip
      }
      │
      ├── setSliderValue(score)  → animeert score-slider
      └── Rendert feedback-blokken in feedbackBox
```

---

## Scenarios

8 ingebouwde scenario's, gedefinieerd in `SCENARIOS[]`:

| ID | Naam | Stem | Karakter |
|---|---|---|---|
| 0 | Studiesecretariaat | shimmer | Zakelijk, formulier-reflex |
| 1 | IT Helpdesk | echo | Technisch, snel vragend |
| 2 | Studentendecaan | shimmer | Warm maar vol agenda |
| 3 | Huisartsenpraktijk | echo | Gehaast, vraagt naam+datum |
| 4 | Verhuurder | echo | Nonchalant, stelt uit |
| 5 | OV-klantenservice | shimmer | Script-volgend, verwijst naar app |
| 6 | Stagebedrijf | echo | Zakelijk, beoordelend |
| 7 | Apotheek | echo | Vriendelijk maar nauwgezet |

Elk scenario bevat: `name`, `emoji`, `voice`, `sub`, `desc`, `tip`, `person`, `character`, `context`.

---

## Moeilijkheidsgraden

Drie niveaus die het gedrag van de AI-gesprekspartner beïnvloeden via de `modifier` in de system prompt:

| Level | Label | Effect |
|---|---|---|
| easy | 😊 Rustig | Geduldig, geeft ruimte, wacht af |
| medium | 😐 Normaal | Professioneel, vraagt door bij stilte |
| hard | 😰 Pittig | Gehaast, onderbreekt, stelt tegenvragen |

---

## Lokale server

De applicatie vereist HTTPS of localhost voor `getUserMedia` (microfoontoegang). Gebruik de meegeleverde `server.py`:

```bash
python3 server.py
# → http://localhost:8080
```

---

## Bekende beperkingen

- **API-sleutel client-side:** geschikt voor eigen gebruik, niet voor publieke deployment
- **Geen sessie-opslag:** transcripten en feedback worden niet bewaard na het sluiten van de pagina
- **Eén gesprek tegelijk:** geen ondersteuning voor parallelle sessies
- **WebRTC vereist moderne browser:** Chrome/Edge 90+, Firefox 85+, Safari 15+
- **Whisper taalslot:** vastgezet op `nl`; werkt minder goed bij sterk accent
