#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  Provision Azure resources for the SpeakEasy monorepo.
#  Idempotent: running it twice is safe; existing resources are left alone.
#  Prereqs: az CLI, logged in (`az login`), default subscription set.
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

RG="${RG:-vu-education-lab-rg}"
LOC="${LOC:-westeurope}"
SKU_FREE="Free"
SKU_STD="Standard"

echo ""
echo "Using resource group: $RG  (location: $LOC)"
echo ""

az group create --name "$RG" --location "$LOC" -o table >/dev/null

create_swa() {
  local name="$1" sku="$2"
  if az staticwebapp show -n "$name" -g "$RG" >/dev/null 2>&1; then
    echo "✓  $name already exists"
  else
    echo "•  creating $name ($sku)…"
    az staticwebapp create \
      --name "$name" \
      --resource-group "$RG" \
      --location "$LOC" \
      --sku "$sku" \
      --source https://github.com/VU-Education-lab/utwente-hackathon-vu \
      --branch main \
      --app-location "/" \
      --login-with-github \
      -o none
  fi
  # Print deployment token for the user to add to GitHub repo secrets.
  local tok
  tok=$(az staticwebapp secrets list -n "$name" -g "$RG" --query 'properties.apiKey' -o tsv)
  echo "    deployment token: $tok"
}

echo "── Shell landing page ─────────────────────────────────────"
create_swa "speakeasy-shell"        "$SKU_FREE"

echo "── Email coach ────────────────────────────────────────────"
create_swa "speakeasy-email-coach"  "$SKU_FREE"

echo "── Bel-angst (call trainer) ───────────────────────────────"
create_swa "speakeasy-bel-angst"    "$SKU_FREE"

echo "── Social sim ─────────────────────────────────────────────"
# Standard tier because we need the managed Functions API for /api/chat etc.
create_swa "speakeasy-social-sim"   "$SKU_STD"

echo ""
echo "Now set Application Settings on speakeasy-social-sim with your real keys:"
cat <<'EOF'
    az staticwebapp appsettings set \
      --name speakeasy-social-sim --resource-group vu-education-lab-rg \
      --setting-names \
        AZURE_OPENAI_ENDPOINT=https://vu-speakeasy-ai.openai.azure.com \
        AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini \
        AZURE_OPENAI_API_KEY=<paste key> \
        ELEVENLABS_API_KEY=<paste key>
EOF

echo ""
echo "Finally, in GitHub → repo Settings → Secrets, add the four deployment"
echo "tokens printed above under these names:"
echo "  AZURE_STATIC_WEB_APPS_API_TOKEN_SHELL"
echo "  AZURE_STATIC_WEB_APPS_API_TOKEN_EMAIL_COACH"
echo "  AZURE_STATIC_WEB_APPS_API_TOKEN_BEL_ANGST"
echo "  AZURE_STATIC_WEB_APPS_API_TOKEN_SOCIAL_SIM"
