# Security & secret handling

This repo is public. Every decision below is made for a "strangers will
read this and try it" threat model.

## What keys exist

| Provider | Used by | How it reaches the runtime |
|---|---|---|
| Azure OpenAI (chat-completions) | social-sim-claude, bel-angst feedback | Azure Static Web Apps Function App Setting, called via `/api/chat` |
| Azure OpenAI (realtime) | bel-angst live calls | Static Web Apps Function at `/api/realtime-token` issues short-lived ephemeral client secrets |
| ElevenLabs (TTS + STT) | social-sim-claude | Static Web Apps Function at `/api/tts` and `/api/stt` |

**No key is ever baked into a committed source file or a production JS
bundle.** The browser only ever talks to `/api/*` endpoints on the same
Static Web App domain; the Function in front of them reads the real key
from Application Settings (server-side).

## Local development

- `social-sim-claude/.env` — holds local keys, **gitignored**, used only by
  the Vite dev server. When deployed, these vars are ignored — the client
  calls `/api/*` instead.
- `bel-angst/local-config.js` — gitignored dev-only file that assigns
  `window.BEL_ANGST_CONFIG`. See
  [`bel-angst/.env.example`](./bel-angst/.env.example).
- `.env.example` files are committed as templates with blank values.

## Rotation log

| Date | Key | Reason |
|---|---|---|
| _pending_ | _Azure OpenAI `vu-speakeasy-ai` key 1_ | Rotate before first public push |
| _pending_ | _Azure OpenAI `bel-oefening-openai` key 1_ | Rotate before first public push |
| _pending_ | _ElevenLabs SpeakEasy key_ | Rotate before first public push |

## Guardrails on the Azure resource

- Tokens-per-minute quota set low on each deployment so a scraped proxy
  can't drain the account.
- Daily spend alert at €5 on the VU subscription.
- Logs in Application Insights so abusive patterns show up.

## What NOT to do

- Don't re-introduce `VITE_*` keys in `social-sim-claude` — they ship in the
  bundle. The refactor replaced them with `/api/*` proxy calls.
- Don't hardcode endpoints in `bel-angst/config.js` — they load from
  `/api/config` at runtime now.
- Don't commit `.env`, `local-config.js`, or anything under `secrets/`.
  `.gitignore` covers these; a pre-commit scan in the workflow double-checks.

## Reporting a vulnerability

Open an issue marked `[security]` or email the maintainers. Please don't
post working exploits publicly.
