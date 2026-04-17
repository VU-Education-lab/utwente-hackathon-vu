# social-sim-claude — Threat model

The social sim talks to one external service: **Azure OpenAI** on
`vu-speakeasy-ai` — for chat, text-to-speech, and speech-to-text.

## Production: `/api/*` proxy

When deployed to the unified Static Web App the Vite bundle **never sees
the key**. The front-end calls:

- `POST /api/chat` — forwarded to `{AZURE_OPENAI_ENDPOINT}/openai/v1/chat/completions`
- `POST /api/tts`  — forwarded to `{AZURE_OPENAI_ENDPOINT}/openai/deployments/{tts}/audio/speech`
- `POST /api/stt`  — forwarded to `{AZURE_OPENAI_ENDPOINT}/openai/deployments/{whisper}/audio/transcriptions`

Keys + deployment names live as Static Web App **Application Settings**:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`        (chat)
- `AZURE_OPENAI_TTS_DEPLOYMENT`    (text-to-speech)
- `AZURE_OPENAI_STT_DEPLOYMENT`    (whisper)

None are prefixed `VITE_` — that prefix would expose them to the browser
bundle at build time, which is exactly what we're avoiding.

## If a key leaks

1. Regenerate it: `az cognitiveservices account keys regenerate -n vu-speakeasy-ai -g vu-education-lab-rg --key-name Key1`.
2. Update the Static Web App: `az staticwebapp appsettings set -n speakeasy-social-sim --setting-names AZURE_OPENAI_API_KEY=<new>`.
3. Log the rotation in the top-level [`../SECURITY.md`](../SECURITY.md).
