Deployment to Vercel (Frontend + FastAPI backend)
===============================================

This repository is configured so the frontend (Vite static site) and the
FastAPI backend run together on Vercel: the frontend is served from
`/frontend` and the backend is exposed as serverless functions under
`/api`.

What I added
- Root `vercel.json` with builds and routes for `api/index.py` and the frontend
- `api/index.py` — an ASGI entrypoint that imports your existing FastAPI `app`
- `api/requirements.txt` — copied dependencies for Vercel to install
- Frontend change: `frontend/src/services/api.js` now defaults to `/api`
- GitHub Actions workflow to deploy `main` branch to Vercel (preview/prod)

Required Vercel Project Settings
- Create a Vercel project and connect the GitHub repository (recommended).
- Add the following Environment Variables in the Vercel Project settings:
  - `SENTINEL_CLIENT_ID` (sentinel hub client id)
  - `SENTINEL_CLIENT_SECRET` (sentinel hub secret)
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `JWT_SECRET`
  - any other keys referenced in `backend/app/config.py` or `backend/.env`

Required GitHub Secrets (for the auto-deploy workflow)
- In the repository settings → Secrets → Actions, add:
  - `VERCEL_TOKEN` — your Vercel personal token (from Vercel Account → Tokens)
  - `VERCEL_ORG_ID` — organization id (optional; not required for CLI deploy)
  - `VERCEL_PROJECT_ID` — project id (optional; not required for CLI deploy)

Notes about the GitHub Action
- The workflow file `.github/workflows/deploy-vercel-main.yml` deploys the
  repository on pushes to the `main` branch. The workflow uses the Vercel CLI
  to perform a deploy (so only `VERCEL_TOKEN` is strictly required). By
  default the action creates a Preview deployment; to make pushes to `main`
  perform production deployments, add `--prod` to the `vercel` command in the
  workflow.

How to enable
1. Create a Vercel project and connect the repository, or note the project/org IDs.
2. Add the environment variables and secrets described above.
3. Push to the `main` branch. The GitHub Action will run and create a Vercel deployment.

Local dev notes
- For local front-end development, run `npm run dev` inside `frontend`.
- For local backend development, run `uvicorn app.main:app --port 8000` inside `backend`.
- To test the integrated setup locally, set `VITE_API_URL` to `http://localhost:8000` in `frontend/.env`

Next steps I can do for you
- Add a second workflow to auto-deploy `main` to Production on merge.
- Create a small script to validate required env vars at startup and fail fast.
