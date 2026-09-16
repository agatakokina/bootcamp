# Bootcamp App

A small QA/test-management tool: test cases, test suites, a bug tracker, test
runs, generated reports, and a dashboard. React + Vite frontend (`client/`)
and an Express + SQLite backend (`server/`), managed as an npm workspaces
monorepo.

## Local development

```bash
npm install
npm run dev
```

This starts the Express API on `http://localhost:3001` and the Vite dev
server on `http://localhost:5173` (which proxies `/api/*` to the Express
server). Open `http://localhost:5173`.

Copy `.env.example` to `.env` in the repo root if you want to set any of the
optional environment variables (see that file for what each one does — none
are required for local dev).

## Deploy

This app is deployed as a **single Render web service**: the build step
compiles the Vite frontend to static files, and the same Express process
serves both the built frontend and the `/api/*` routes.

### Why Render

The backend uses `better-sqlite3` against a local SQLite file — that needs a
real, persistent-for-the-life-of-the-process filesystem and a long-running
Node process. Render's free **Web Service** plan gives you exactly that (a
real `node` process on a normal filesystem). Vercel, Netlify, and Cloudflare
Pages are serverless-first for backend code: Cloudflare Pages Functions run
on the Workers runtime, which can't load a native module like
`better-sqlite3` at all, and Vercel/Netlify functions can run it but give
each invocation its own ephemeral filesystem — with concurrent requests
potentially landing on different instances, that risks inconsistent data
*within a single session*, not just an eventual reset. Render was the only
one of the four that runs this app correctly without a rewrite of the data
layer.

**Free-tier trade-off, please read:** Render's free Web Service has **no
persistent disk** — the SQLite file (and any data in it) is wiped whenever
the service redeploys or spins down after ~15 minutes of inactivity, and
takes ~30-60s to spin back up on the next request. This is fine for a demo/
portfolio deployment; it is not durable storage. If you need real
persistence later, add a paid Render Postgres instance and swap
`server/db.js` to use it instead of the local SQLite file.

Verified at the time this was written: Render's free Web Service tier
(`plan: free` in `render.yaml`) is active, and Vercel's free Hobby tier is
also active — the choice here was about architecture fit, not tier
availability.

### One-time setup

1. **Push this repo to GitHub** (or GitLab.com). Render's dashboard/CLI
   connect natively to those; it doesn't have a built-in integration for
   arbitrary self-hosted Git servers like this repo's current `origin`
   (`code.tdlbox.com`). If you don't already have a GitHub remote:

   ```bash
   git remote add github https://github.com/<your-username>/<your-repo>.git
   git push github main
   ```

2. **Install the Render CLI** (one-time):

   ```bash
   brew tap render-oss/render && brew install render
   ```

   (Or see <https://render.com/docs/cli> for other install methods if you're
   not on macOS/Homebrew.)

3. **Log in** (opens your browser):

   ```bash
   render login
   ```

### Deploy

This repo already has a `render.yaml` describing the service (build command,
start command, free plan). The single command to create and deploy it:

```bash
render services create
```

Run with no flags, this drops into the CLI's interactive wizard (it only
skips the wizard and requires everything up front as flags if you pass any
config flags at all, which we're deliberately not doing here since the exact
required flag set isn't guaranteed stable). Answer the prompts with:

| Prompt              | Answer                                             |
| -------------------- | --------------------------------------------------- |
| Service type          | Web Service                                        |
| Repository            | your GitHub repo URL from step 1                   |
| Branch                | `main`                                             |
| Runtime               | Node                                               |
| Region                | any (e.g. Oregon)                                  |
| Instance type / plan  | Free                                                |
| Build command          | `npm install && npm run build -w client`           |
| Start command          | `npm start -w server`                              |
| Name                   | `bootcamp-app` (or anything you like)              |

When it asks about environment variables, add `DISCORD_WEBHOOK_URL` and
`APP_BASE_URL` if you want the Discord failure-alert feature (both optional —
skip them if you don't need it). On success the CLI prints the service's
public `onrender.com` URL — that's the one to paste back.

Replace `<your-username>/<your-repo>` with wherever you pushed it in step 1.
Render will prompt you to confirm, then build and deploy — the CLI prints
the live URL when it's done (also visible any time on your Render
dashboard). If you set `DISCORD_WEBHOOK_URL` or `APP_BASE_URL` in
`render.yaml`'s `envVars`, Render will prompt you for their values on first
deploy since they're marked `sync: false` (not committed).

Subsequent deploys happen automatically on every push to the connected
branch (Render's default), or manually via `render deploys create`.
