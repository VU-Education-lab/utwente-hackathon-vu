# SpeakEasy — Utwente Hackathon VU

A monorepo of four small apps built during the Utwente × VU "AI in education"
hackathon. They share one theme: **low-stakes practice spaces** for students
who find everyday academic communication hard.

| Project | What it is | Stack |
|---|---|---|
| [`shell/`](./shell) | Landing page tying the three tools together | Static HTML/CSS |
| [`e-mail-coach/`](./e-mail-coach) | In-browser email writing coach with live tone scoring | Static HTML + client-side JS |
| [`bel-angst/`](./bel-angst) | Voice calling trainer (WebRTC realtime) with AI personas | JS + WebRTC + Azure OpenAI Realtime |
| [`social-sim-claude/`](./social-sim-claude) | 3D social scene with AI-driven characters | Vite + Three.js + Azure OpenAI + ElevenLabs |
| [`SpeakEasyUI-TJ/`](./SpeakEasyUI-TJ) | Design exploration + scenario library (not deployed) | Streamlit + FastAPI |

## Live demos

Filled in after the first successful Azure deploy — see
[`SECURITY.md`](./SECURITY.md) for how secrets are handled in production.

- Landing: _TBD_
- Email coach: _TBD_
- Call trainer: _TBD_
- Social sim: _TBD_

## Local development

Each project is independent. From its directory:

```bash
# shell / e-mail-coach (static)
npx serve .

# bel-angst
python3 server.py                       # http://localhost:8080
#  plus a gitignored local-config.js defining window.BEL_ANGST_CONFIG

# social-sim-claude
cp .env.example .env                    # then fill in keys
npm install && npm run dev              # http://localhost:5173
```

## Deploying

All four public-facing apps target **Azure Static Web Apps** in resource
group `vu-education-lab-rg`. The social sim and call trainer also use a
small Azure Functions API (shipped under each project's `api/` folder) to
keep Azure OpenAI and ElevenLabs keys off the browser. See
[`scripts/provision-azure.sh`](./scripts/provision-azure.sh) for
reproducible resource creation and [`.github/workflows/`](./.github/workflows)
for the CI/CD wiring.

## Contributing

This repo is a snapshot of a 24-hour hackathon. Issues and PRs welcome,
but each project's structure reflects what could be built in that window,
not a long-term architecture.

## License

MIT — see [`LICENSE`](./LICENSE) for details.
