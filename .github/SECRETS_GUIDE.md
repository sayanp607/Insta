# GitHub repository secret names required by the CI/CD workflows.
# Add these in: GitHub repo → Settings → Secrets and variables → Actions → New repository secret

## ── Backend ───────────────────────────────────────────────────────────────
# SECRET_KEY            → Your JWT signing secret (same as backend .env SECRET_KEY)
# RENDER_DEPLOY_HOOK_URL→ Render deploy hook URL for the backend service
#                         Render dashboard → Service → Settings → Deploy Hooks → Add hook

## ── Frontend ──────────────────────────────────────────────────────────────
# VITE_API_URL          → Deployed backend URL (e.g. https://insta-backend.onrender.com)
# VITE_ML_URL           → ML service URL       (e.g. https://insta-ml.onrender.com)
# VERCEL_TOKEN          → Vercel personal access token
#                         https://vercel.com/account/tokens
# VERCEL_ORG_ID         → Found in Vercel Project Settings → General (Team ID or personal)
# VERCEL_PROJECT_ID     → Found in Vercel Project Settings → General

## ── ML Service ────────────────────────────────────────────────────────────
# RENDER_ML_DEPLOY_HOOK_URL → Render deploy hook URL for the ml-service

# ─────────────────────────────────────────────────────────────────────────────
# How to get Vercel IDs
# ─────────────────────────────────────────────────────────────────────────────
# Install Vercel CLI:   npm i -g vercel
# Link your project:    cd frontend && vercel link
# This generates .vercel/project.json with orgId and projectId
