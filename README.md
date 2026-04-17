# SpeakEasy — Utwente Hackathon VU

A monorepo of three small practice apps, one landing shell, and a shared
serverless API. Built during the Utwente × VU "AI in education" hackathon.
Theme: **low-stakes practice spaces** for students who find everyday
academic communication hard.

| Project | What it is | Stack |
|---|---|---|
| [`shell/`](./shell) | Landing page + iframe chrome tying the three tools together | Static HTML/CSS |
| [`e-mail-coach/`](./e-mail-coach) | In-browser email writing coach with live tone scoring | Static HTML + client-side JS + Transformers.js |
| [`bel-angst/`](./bel-angst) | Voice calling trainer (WebRTC realtime) with AI personas | JS + WebRTC + Azure OpenAI Realtime (via `/api/realtime-token`) |
| [`social-sim-claude/`](./social-sim-claude) | 3D social scene with AI-driven characters | Vite + Three.js + Azure OpenAI + ElevenLabs (via `/api/*`) |
| [`SpeakEasyUI-TJ/`](./SpeakEasyUI-TJ) | Design exploration + scenario library (not deployed) | Streamlit + FastAPI |
| [`api/`](./api) | Shared Azure Functions: `chat`, `tts`, `stt`, `realtime-token` | Node 20 |

## One domain, one SWA

All four public-facing apps deploy to a **single Azure Static Web App**.
Sub-apps live under path prefixes so everything shares an origin, a
set of secrets, and a back-to-shell navigation:

```
https://<host>/                         # landing page
https://<host>/app.html?step=email      # iframe shell for step 1
https://<host>/email/                   # e-mail-coach
https://<host>/call/                    # bel-angst
https://<host>/sim/                     # social-sim
https://<host>/api/{chat,tts,stt,realtime-token}   # shared Functions
```

No key ever reaches the browser. Every call that needs a secret goes
through `/api/*`, which reads from the SWA's Application Settings. See
[`SECURITY.md`](./SECURITY.md) for the threat model + rotation log.

## Local development

Two options, depending on what you want to test.

**Option A — just poke at a single sub-app** (no keys, no Functions):

```bash
# social-sim (with dev-time Vite proxy to a local Functions host if you want AI)
cd social-sim-claude && npm install && npm run dev

# bel-angst (pure static)
cd bel-angst && npx serve .

# e-mail-coach (pure static)
cd e-mail-coach/prototype_v2 && npx serve .
```

**Option B — emulate the full deployed stack** including `/api/*`:

```bash
bash scripts/build-monorepo.sh                      # assembles ./dist/
cp api/local.settings.json.example api/local.settings.json   # fill in keys
npx @azure/static-web-apps-cli start dist --api-location api
# open http://localhost:4280/
```

The `.local-original/` tree preserves the original per-project iframe
flow if you want to demo from a plain `python3 -m http.server`.

## Deploying

One GitHub Actions workflow ([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml))
runs on every push to `main`:

1. `bash scripts/build-monorepo.sh` assembles everything into `dist/`.
2. `Azure/static-web-apps-deploy@v1` uploads `dist/` + `api/` to the SWA
   using the `AZURE_STATIC_WEB_APPS_API_TOKEN_SPEAKEASY` secret.

The SWA is `speakeasy-social-sim` (legacy name — it now hosts the whole
app) in resource group `vu-education-lab-rg`.
[`scripts/provision-azure.sh`](./scripts/provision-azure.sh) holds the
`az` commands used to create + configure it.

## License

MIT — see [`LICENSE`](./LICENSE).
