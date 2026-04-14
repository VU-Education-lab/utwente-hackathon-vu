# Social Sim

A browser-based social environment simulator built to help students and young people practice being around people, so social situations feel less overwhelming when they happen for real.

You walk into an already-alive 3D scene — a lecture hall before class, a cafeteria, a study group, a networking mixer, a noisy house party — where AI characters are talking to each other. You can hang back and listen, walk closer to a group, or type in something to say. The characters react in real time, with voices, and the scene keeps moving on without you if you freeze up.

It's designed to be a low-pressure rehearsal space, not a game.

---

## Features

- **Five scenarios** that escalate in social complexity (1/5 to 5/5).
- **Live, autonomous AI dialogue** between distinct characters with their own personalities, generated through OpenRouter.
- **Real-time text-to-speech** so you can hear the characters speaking, with each one assigned a different browser voice.
- **Walk-around 3D environment** (Three.js) with WASD/arrow keys + mouse-look. Each character has a name tag that lights up when they're within earshot.
- **Comfort meter** that reflects your engagement without judging silence — being in the room and listening counts as showing up.
- **Coach hint button** (or press Tab in the input box) — asks the model for a small, low-stakes thing you could say next.
- **Pause and rewind** — pause the entire scene at any time, or rewind 30 seconds to try a different reply.
- **Cross-session progress** stored locally: visits per scenario, best comfort score, lines spoken.

---

## Architecture

```
social-sim-claude/
├── index.html
├── package.json
├── vite.config.js                    # Vite + a tiny dev plugin that writes /__log to social-sim.log
├── .env.example
├── social-sim.log                    # appended to in dev mode (gitignored)
└── src/
    ├── main.js                       # top-level controller, wires everything
    ├── style.css                     # all the UI styling
    ├── scene/
    │   ├── Scene.js                  # Three.js renderer + camera + input + gaze logic
    │   ├── Environment.js            # builds each scenario's room
    │   └── Character.js              # low-poly humanoid w/ talking anim
    ├── ai/
    │   ├── OpenRouterClient.js       # fetch wrapper, supports chat() and chatWithTool()
    │   ├── Director.js               # the LLM orchestrator — decides who speaks, when, intent
    │   └── ConversationManager.js    # owns the loop; calls director, then speaker
    ├── audio/
    │   └── TTSManager.js             # Web Speech API wrapper, per-character voices
    ├── ui/
    │   └── UI.js                     # all DOM wiring, transcript, overlays
    ├── state/
    │   ├── Comfort.js                # comfort meter rules
    │   └── Progress.js               # localStorage progress tracker
    ├── util/
    │   └── logger.js                 # browser logger that POSTs to /__log
    └── scenarios/
        └── scenarios.js              # the five scenes + their characters
```

### How a beat works

Every ~800ms the `ConversationManager` ticks:

1. If there's no pending decision → ask the **Director** (LLM call with a forced tool call) what should happen next. The director returns `{ next_speaker, wait_seconds, intent, addressed_to, tone_hint, reasoning }`.
2. If a decision is pending and its scheduled time has come → execute it. If it's a silence beat, log and move on. Otherwise call the speaker model to generate the actual line, with the director's intent + tone + addressee embedded in the prompt.
3. The line goes through a heavy sanitizer (strip stage directions, markdown, name prefixes, meta-preambles, reasoning leaks, echoes) before it's shipped to the UI.

So each spoken line costs **two** OpenRouter calls (director + speaker). When the user types, the director is invalidated and re-asked immediately so the next decision reflects the new world state.

### Logs

Anything the app does in dev mode is logged to **`./social-sim.log`** at the project root. Each line is timestamped:

```
2026-04-09T14:32:11.083Z INFO  director   decision #4 ← 1240ms {"next_speaker":"mira","wait_seconds":3,...}
2026-04-09T14:32:11.084Z INFO  convo      decision scheduled in 3s {...}
2026-04-09T14:32:14.105Z INFO  api        [a1b2c3] [Mira] → POST {...}
2026-04-09T14:32:15.910Z INFO  speaker    Mira (respond_to_user, warm and curious) → Yeah, that one took me forever too.
```

The same lines are also printed to the dev server's terminal stdout, so `npm run dev` is a live tail. If you want to share the log with someone (or me) for debugging, just open `social-sim.log`.

Each scenario defines (in `src/scenarios/scenarios.js`):

- The room kind (which `Environment.js` builds out of primitives).
- A short blurb shown on the title card.
- A few seed topics the characters are already discussing when you arrive.
- A list of characters with `name`, `role`, `personality`, `voiceHint`, and a starting `position`.

The conversation loop is intentionally simple: every ~2 seconds the `ConversationManager` picks one character and asks the LLM for a single short line of dialogue, given the recent transcript and that character's personality. When the user types something, it's pushed into the transcript and the next beat is triggered immediately so a character responds. Speaker selection is done locally — recent speakers and named characters get weighted appropriately — so the room never stalls waiting on the model.

---

## Getting started

### Prerequisites

- **Node.js 18+** and npm
- An **OpenRouter API key** — sign up at <https://openrouter.ai> and create one at <https://openrouter.ai/keys>. You can use it with the free `openrouter/auto` route, or pick a specific model.
- A modern browser (Chrome, Edge, or Safari recommended — they have the best Web Speech API voices).

### 1. Install

```bash
cd social-sim-claude
npm install
```

### 2. Configure your API key

```bash
cp .env.example .env
```

Open `.env` and set:

```
VITE_OPENROUTER_API_KEY=sk-or-v1-your-key-here
VITE_OPENROUTER_MODEL=openrouter/auto
```

`VITE_OPENROUTER_MODEL` is optional. `openrouter/auto` lets OpenRouter pick a sensible model for you. You can also use, for example:

- `anthropic/claude-haiku-4-5` — fast and cheap, great for one-line dialogue
- `openai/gpt-4o-mini`
- `google/gemini-2.0-flash-001`
- any other model id from <https://openrouter.ai/models>

> **Security note:** Vite exposes any variable prefixed with `VITE_` to the browser bundle. That's the only way the browser can read it without a backend. **Anyone who opens devtools on a deployed build can read your key.** This is fine for local hackathon use, but if you ever host this publicly, put a small proxy server in front of OpenRouter and call that from the browser instead of embedding the key.

### 3. Run

```bash
npm run dev
```

Then open <http://localhost:5173> (Vite usually opens it for you).

### 4. Build for production

```bash
npm run build
npm run preview
```

---

## How to play

1. From the title screen, pick a scenario. Difficulty 1 is the gentlest (you have a seat, nobody is looking at you, the assignment is the topic).
2. You spawn a few steps away from the group. **Click the canvas** to enable mouse-look, then use **WASD** or **arrow keys** to walk. Hold **Shift** to walk slowly.
3. Walk into earshot of the group. The characters will continue their conversation; their name tags turn blue when you're close enough that they might notice you.
4. Listen as long as you want. Nothing forces you to speak.
5. When you're ready, type something into the input box at the bottom and press **Enter**. A character will react and the conversation continues from there.
6. Stuck? Click **Hint** (or press **Tab** in the input box). The coach will suggest a small, low-stakes thing you could say.
7. Need a break? Press **Esc** or click ⏸ to pause the entire scene — voices stop, characters stop, nothing moves until you say so.
8. Said something you regret? Click ⟲ to **rewind 30 seconds** and try a different reply.
9. When you're done, click ← in the top-left to leave. You'll see a debrief with your stats, and the scenario card on the title screen will remember your best comfort score.

---

## Therapeutic design choices

This is a practice space, not a quiz. A few rules the app follows on purpose:

- **Silence is never punished.** Standing nearby and listening drifts comfort *up*, not down. The comfort meter is a reflection, not a score.
- **No game-over.** You can't fail a scene. You can pause forever. You can leave whenever.
- **Rewind is normal.** Real conversations don't have an undo button — but a practice space should. Use it freely.
- **The hint button is always available.** No "you ran out of hints". Asking for help is the point.
- **The characters notice you, gently.** If you've been standing within earshot silently for a while, the next speaker may acknowledge you. They won't corner you.
- **Difficulty is a ladder, not a wall.** Repeat scenario 1 ten times if you want. Move up only when it feels routine.

If you build on this, please keep these defaults — they matter more than the graphics or the voices.

---

## Customization

### Add a scenario

Edit `src/scenarios/scenarios.js`. Copy an existing entry and tweak it. The fields:

```js
{
  id: 'unique-id',
  name: 'Display name',
  sub: 'Subtitle shown in the HUD',
  difficulty: 1,                       // 1 (easiest) to 5 (hardest)
  environment: 'classroom',            // see Environment.js for the kinds
  blurb: 'Short scene description shown on the title card.',
  seedTopics: [
    'topic 1 the characters are mid-discussion about',
    'topic 2',
  ],
  characters: [
    {
      id: 'short-id',
      name: 'Display name',
      role: 'short bio',
      personality: 'one-sentence personality + speaking style',
      voiceHint: 'female-warm',        // see TTSManager.js for the hints
      position: [-1.5, 0, -2.2],       // [x, 0, z] in world coordinates
    },
  ],
}
```

### Add an environment kind

Edit `src/scene/Environment.js` and add a new branch in `buildEnvironment()`. Build whatever you want out of `BoxGeometry`, `CylinderGeometry`, etc. — you don't need any external assets.

### Tweak personalities

Edit the character entries in `src/scenarios/scenarios.js`. The `personality` field is dropped directly into each LLM prompt as part of the character card.

---

## Tech notes

- **Three.js**: `^0.175.0`. We use only built-in geometries and materials, no GLTF loading.
- **Vite**: `^6.3.2` for dev server and build.
- **OpenRouter**: chat completions endpoint at `https://openrouter.ai/api/v1/chat/completions`. We send OpenAI-compatible JSON bodies. See `src/ai/OpenRouterClient.js`. Docs: <https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request>.
- **Web Speech API**: `speechSynthesis.speak()` with per-character voices selected from `getVoices()`. Voice availability and quality varies by browser and OS — Chrome and Edge ship the most voices, Safari sounds the most natural on macOS.

---

## Troubleshooting

**"OpenRouter API key missing" warning** — You haven't created `.env` yet, or it doesn't have `VITE_OPENROUTER_API_KEY`. Restart `npm run dev` after editing `.env`.

**Characters never speak** — Check the browser console. The most likely causes: (a) wrong API key, (b) you're out of OpenRouter credits, (c) the model name in `VITE_OPENROUTER_MODEL` isn't valid. Try `openrouter/auto`.

**Voices all sound the same** — Your browser only has one voice installed. Try Chrome or Edge — they ship more voices. On macOS, Safari uses system voices, which you can install in System Settings → Accessibility → Spoken Content.

**No sound at all** — Web Speech API needs a user gesture before it can play in some browsers. Click anywhere on the page first.

**Mouse-look feels wrong** — Click the canvas to engage pointer lock, press Esc to release it. Keys won't move you while a text input is focused.

**Build complains about chunk size** — That's just Three.js being big. It's a warning, not an error.

---

## License

MIT. Use this however you want, including for non-commercial mental health programs.
