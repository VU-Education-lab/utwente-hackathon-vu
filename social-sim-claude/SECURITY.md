# social-sim-claude — Threat model

The social sim talks to two external services: Azure OpenAI
(chat-completions) and ElevenLabs (TTS + STT). Both require API keys.

## Production: `/api/*` proxy

When deployed to Azure Static Web Apps, the Vite bundle **never sees the
keys**. The front-end calls:

- `POST /api/chat` — forwarded to `{AZURE_OPENAI_ENDPOINT}/openai/v1/chat/completions`
- `POST /api/tts`  — forwarded to `https://api.elevenlabs.io/v1/text-to-speech/{voice}`
- `POST /api/stt`  — forwarded to `https://api.elevenlabs.io/v1/speech-to-text`

Keys live as Static Web App **Application Settings**:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

These are **not** prefixed `VITE_` — that prefix would expose them to the
browser bundle at build time, which is exactly what we're avoiding.

## Local dev: `.env` with `VITE_*`

For convenience on localhost only, the Vite dev server lets the client
read keys from `.env` via `import.meta.env.VITE_*`. This is fine because:

- `.env` is gitignored.
- The dev server binds only to `localhost`.
- The bundle produced by `npm run build` uses the `/api/*` proxy path and
  does not read `VITE_*` keys at all.

If you ever publish a `dist/` built with `VITE_*` keys populated, the keys
will ship in the JS. Don't. `npm run build` is only for CI → Azure Static
Web Apps, where the env is empty and the app falls through to `/api/*`.

## Models / assets

The `.glb` avatars are not secret but are large (~60 MB total). They are
tracked via Git LFS (`.gitattributes` at repo root). Fresh clones need
`git lfs pull` — the GitHub Action handles this with `lfs: true`.

## If a key leaks

1. Regenerate it in the Azure portal (`vu-speakeasy-ai` → Keys and Endpoint)
   or ElevenLabs dashboard.
2. Update the Static Web App Application Settings.
3. Log the rotation in the top-level [`../SECURITY.md`](../SECURITY.md).
