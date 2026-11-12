# Deploy RoadLedger on Vercel (Frontend)

Your build failed because Vercel built the **backend** (`roadledger-backend` / `tsc`), not the **frontend** (`Next.js`).

Vercel should only host the **frontend**. The Express API must run elsewhere (Render / Railway / Fly.io / VPS) with MongoDB Atlas.

---

## Why your build failed

Log line:

```text
> roadledger-backend@1.0.0 build
> tsc -p tsconfig.json
```

That means **Root Directory = `backend`** (or repo root with wrong settings).

You must set:

```text
Root Directory = frontend
```

---

## Architecture

```text
Browser
  → https://your-app.vercel.app          (Next.js on Vercel)
       → /api/* rewrite to BACKEND_URL
            → https://your-api.onrender.com  (Express API)
                 → MongoDB Atlas
```

---

## Step 1 — MongoDB Atlas

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create DB user + network access
3. Copy URI, example:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/roadledger?retryWrites=true&w=majority
```

---

## Step 2 — Deploy backend first (not on Vercel)

Use **Render**, **Railway**, or **Fly.io**.

### Backend env vars

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=put-a-long-random-secret-here
JWT_EXPIRES_IN=7d
FRONTEND_ORIGIN=https://YOUR-APP.vercel.app
COOKIE_NAME=roadledger_token
BCRYPT_SALT_ROUNDS=12
```

### Backend start

```bash
cd backend
npm install
npm run build
npm run seed
npm start
```

### Verify

Open:

```text
https://YOUR-BACKEND-URL/api/health
```

Should return:

```json
{ "success": true, "message": "RoadLedger API is running" }
```

Save this backend URL. Example: `https://roadledger-api.onrender.com`

---

## Step 3 — Deploy frontend on Vercel (correct settings)

### A. Import project

1. Push latest code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New…** → **Project**
3. Import `akshayamin62/RoadLedger`

### B. Configure project (critical)

| Setting | Value |
| --- | --- |
| **Root Directory** | `frontend`  ← click Edit and select this |
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Install Command | `npm install` |
| Output Directory | leave default |

Do **not** leave Root Directory as `.` or `backend`.

### C. Environment variables (Frontend)

In Vercel → Project → Settings → Environment Variables:

| Name | Value |
| --- | --- |
| `BACKEND_URL` | `https://YOUR-BACKEND-URL` (no trailing slash) |
| `NEXT_PUBLIC_APP_NAME` | `RoadLedger` |

Example:

```text
BACKEND_URL=https://roadledger-api.onrender.com
NEXT_PUBLIC_APP_NAME=RoadLedger
```

### D. Deploy

Click **Deploy**.

Expected successful log should show something like:

```text
> roadledger-frontend@1.0.0 build
> next build
```

Not `roadledger-backend` / `tsc`.

---

## Step 4 — Connect frontend ↔ backend

1. After Vercel gives you a URL, e.g. `https://roadledger.vercel.app`
2. Update backend env:

```env
FRONTEND_ORIGIN=https://roadledger.vercel.app
```

3. Restart/redeploy the backend
4. Redeploy Vercel once if needed

---

## Step 5 — Test

1. Open `https://YOUR-APP.vercel.app/login`
2. Login or register
3. Add vehicle / party / transaction
4. Confirm data loads

---

## If you already created a wrong Vercel project

1. Open the project → **Settings** → **General**
2. **Root Directory** → Edit → set to `frontend`
3. Save
4. **Settings** → **Environment Variables** → add `BACKEND_URL`
5. **Deployments** → Redeploy latest commit

---

## Cookie / CORS notes

Production cookies use:

- `secure: true`
- `sameSite: "none"`

So both frontend and backend must be HTTPS, and `FRONTEND_ORIGIN` must match the Vercel URL exactly.

---

## Checklist

- [ ] MongoDB Atlas URI ready
- [ ] Backend deployed and `/api/health` works
- [ ] Vercel Root Directory = `frontend`
- [ ] `BACKEND_URL` set on Vercel
- [ ] Backend `FRONTEND_ORIGIN` set to Vercel URL
- [ ] Login works on production URL

---

## Quick fix for your current error

Your current log is building backend TypeScript. That is wrong for Vercel UI hosting.

1. Change Root Directory to `frontend`
2. Set `BACKEND_URL`
3. Redeploy

Backend itself should be deployed on Render/Railway, not as the Vercel root app.
