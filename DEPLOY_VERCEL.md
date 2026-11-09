# Deploy RoadLedger on Vercel

RoadLedger has two parts:

- **Frontend:** Next.js app (deploy to Vercel)
- **Backend:** Express + MongoDB API (deploy separately; Vercel is not ideal for a long-running Express API with MongoDB sessions)

Recommended production setup:

1. Deploy the **frontend** to Vercel
2. Deploy the **backend** to a Node host (Railway, Render, Fly.io, or a VPS)
3. Use **MongoDB Atlas** for the database

---

## 1. Prepare MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow network access from your backend host (or `0.0.0.0/0` for testing).
3. Copy the connection string, for example:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/roadledger?retryWrites=true&w=majority
```

---

## 2. Deploy the backend (required before Vercel frontend)

Use any Node-friendly host. Example with Render/Railway:

### Environment variables (backend)

| Variable | Example / notes |
| --- | --- |
| `PORT` | Provided by host, or `5000` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas URI from step 1 |
| `JWT_SECRET` | Long random secret |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_ORIGIN` | Your Vercel URL, e.g. `https://roadledger.vercel.app` |
| `COOKIE_NAME` | `roadledger_token` |
| `BCRYPT_SALT_ROUNDS` | `12` |

### Start command

```bash
cd backend
npm install
npm run build
npm start
```

Optional seed (run once):

```bash
npm run seed
```

Confirm health:

```text
GET https://YOUR-BACKEND-URL/api/health
```

Expected:

```json
{ "success": true, "message": "RoadLedger API is running" }
```

---

## 3. Deploy the frontend on Vercel

### Option A — Vercel Dashboard

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Open [Vercel](https://vercel.com) → **Add New Project** → import the repo.
3. Configure the project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** leave default (`.next`)
   - **Install Command:** `npm install`
4. Add environment variables:

| Name | Value |
| --- | --- |
| `BACKEND_URL` | `https://YOUR-BACKEND-URL` (no trailing slash) |
| `NEXT_PUBLIC_APP_NAME` | `RoadLedger` |

5. Click **Deploy**.

### Option B — Vercel CLI

```bash
npm i -g vercel
cd frontend
vercel login
vercel
```

During setup:

- Set root to `frontend` if prompted from repo root
- Add `BACKEND_URL` and `NEXT_PUBLIC_APP_NAME`

Production deploy:

```bash
vercel --prod
```

---

## 4. Cookie / CORS checklist (important)

Auth uses HTTP-only cookies across two domains (Vercel frontend + separate API).

In **backend** production env:

```env
NODE_ENV=production
FRONTEND_ORIGIN=https://YOUR-FRONTEND.vercel.app
```

In `backend/src/utils/cookie.ts`, production cookies already use:

- `secure: true`
- `sameSite: "none"`

So:

1. Frontend must be HTTPS (Vercel provides this).
2. Backend must be HTTPS.
3. `FRONTEND_ORIGIN` must exactly match the Vercel URL (including `https://`, no trailing slash).

If login works locally but fails on Vercel, first verify:

- Browser Network tab shows `Set-Cookie` from login
- Cookie has `Secure` + `SameSite=None`
- API responses include CORS `Access-Control-Allow-Credentials: true`

---

## 5. Post-deploy verification

1. Open `https://YOUR-APP.vercel.app/login`
2. Sign in with seeded admin or register a new account
3. Create one vehicle, one party (GST optional), one transaction, one spare-part payment
4. Confirm dashboard totals update
5. Confirm logout clears the session

---

## 6. Optional: monorepo tips

If Vercel detects the repo root instead of `frontend`:

1. Project Settings → **General** → **Root Directory** → `frontend`
2. Redeploy

Do **not** set the Vercel root to `backend`. The Express API should stay on a Node host.

---

## 7. Minimal architecture diagram

```text
Browser
  └─ Vercel (Next.js frontend)
       └─ /api/* rewrite → BACKEND_URL
            └─ Railway/Render/Fly (Express API)
                 └─ MongoDB Atlas
```

The frontend rewrite in `frontend/next.config.ts` forwards `/api/:path*` to `BACKEND_URL`, so the browser talks to the same Vercel origin and cookies remain first-party to that origin **only if** backend and frontend share a domain strategy.

### If cookies fail across different domains

Best production fix: put both behind one domain with paths/subdomains you control, or proxy the API through Vercel rewrites only and ensure the Set-Cookie domain matches the frontend host.

Practical approach used by this project:

- Browser calls `https://your-app.vercel.app/api/...`
- Vercel rewrite forwards to `https://your-api.host/api/...`
- Because the browser sees responses from `your-app.vercel.app`, configure the backend cookie carefully, **or** prefer hosting API under the same custom domain.

Recommended custom domain setup:

```text
app.yourdomain.com      → Vercel frontend
api.yourdomain.com      → Express backend
```

Then set:

```env
FRONTEND_ORIGIN=https://app.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

And update cookie `sameSite`/`secure` as needed for your domain policy.

---

## 8. Troubleshooting

| Issue | Fix |
| --- | --- |
| Build fails on Vercel | Confirm Root Directory is `frontend` |
| API 404 from frontend | Check `BACKEND_URL` and that backend `/api/health` works |
| Login always fails | Check `JWT_SECRET`, MongoDB URI, and CORS/`FRONTEND_ORIGIN` |
| Cookie not saved | Ensure HTTPS + `SameSite=None` + matching frontend origin |
| GST save errors for blank GST | Restart backend so the new optional GST index migration runs |

---

## Quick command summary

```bash
# Backend host
cd backend
npm install
npm run build
npm run seed
npm start

# Frontend on Vercel
cd frontend
vercel --prod
```
