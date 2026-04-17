#!/usr/bin/env bash
# Assemble every sub-app into ./dist/ so the Azure Static Web App deploy
# uploads a single tree. The layout matches staticwebapp.config.json:
#
#   dist/
#     index.html + shell.* + app.html   <- landing + iframe shell
#     email/                            <- e-mail-coach/prototype_v2
#     call/                             <- bel-angst (no server.py)
#     sim/                              <- social-sim vite build output

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> clean dist/"
rm -rf dist
mkdir -p dist/email dist/call dist/sim

echo "==> shell -> dist/"
cp shell/index.html shell/app.html shell/shell.js dist/
cp shell/shell.css shell/theme.css shell/theme-dark.css dist/
cp shell/dutch-universities.png dist/

echo "==> e-mail-coach -> dist/email/"
cp -R e-mail-coach/prototype_v2/. dist/email/

echo "==> bel-angst -> dist/call/"
cp bel-angst/index.html bel-angst/app.js bel-angst/config.js bel-angst/scenarios.js dist/call/
# Include README for anyone poking at the deployed tree.
cp bel-angst/README.md dist/call/ 2>/dev/null || true

echo "==> social-sim (vite build) -> dist/sim/"
pushd social-sim-claude >/dev/null
  if [[ ! -d node_modules ]]; then
    echo "    installing social-sim dependencies"
    npm ci
  fi
  npm run build
popd >/dev/null
cp -R social-sim-claude/dist/. dist/sim/

echo "==> copy Static Web App config"
cp staticwebapp.config.json dist/staticwebapp.config.json

echo "==> done. dist/ size:"
du -sh dist 2>/dev/null || true
