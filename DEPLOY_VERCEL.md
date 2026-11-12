# Deploy RoadLedger on Vercel

You need **two Vercel projects** from the same GitHub repo:

1. **Backend API** → Root Directory = `backend`
2. **Frontend app** → Root Directory = `frontend`

Plus **MongoDB Atlas** for the database.

---

## Part A — MongoDB Atlas (required)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Database Access → create user
3. Network Access → allow `0.0.0.0/0`
4. Connect → copy URI:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/roadledger?retryWrites=true&w=majority
```

---

## Part B — Deploy BACKEND on Vercel

### 1. Create project

- Vercel → **Add New Project**
- Import `akshayamin62/RoadLedger`

### 2. Fill the Configure Project form exactly like this

| Field | Value |
| --- | --- |
| **Project Name** | `roadledger-api` (any name) |
| **Root Directory** | `backend` |
| **Framework Preset** | **Other** (or leave detected) |
| **Build Command** | **Override ON** → leave empty, or put `echo "vercel-node build"` |
| **Output Directory** | Off / empty |
| **Install Command** | Off (default `npm install`) |

Important: because this backend uses `api/index.ts` + `vercel.json`, Vercel compiles it with `@vercel/node`.  
Do **not** rely on `npm run build` / `tsc` for the Vercel backend project.

If Vercel forces a build command, set override to:

```bash
npm install
```

### 3. Environment Variables (backend project)

| Key | Value |
| --- | --- |
| `MONGODB_URI` | your Atlas URI |
| `JWT_SECRET` | long random secret |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_ORIGIN` | temporarily `http://localhost:3000` (update after frontend deploy) |
| `COOKIE_NAME` | `roadledger_token` |
| `BCRYPT_SALT_ROUNDS` | `12` |
| `NODE_ENV` | `production` |

### 4. Deploy

Click **Deploy**.

When done, open:

```text
https://YOUR-BACKEND.vercel.app/api/health
```

Expected:

```json
{ "success": true, "message": "RoadLedger API is running" }
```

Save this URL as your backend URL.

---

## Part C — Deploy FRONTEND on Vercel

### 1. Create a second project

- Vercel → **Add New Project** again
- Same repo `akshayamin62/RoadLedger`

### 2. Configure form

| Field | Value |
| --- | --- |
| **Project Name** | `roadledger` |
| **Root Directory** | `frontend` |
| **Framework Preset** | **Next.js** |
| **Build Command** | default (`npm run build`) |
| **Output Directory** | default |
| **Install Command** | default |

### 3. Environment Variables (frontend project)

| Key | Value |
| --- | --- |
| `BACKEND_URL` | `https://YOUR-BACKEND.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | `RoadLedger` |

### 4. Deploy frontend

After it succeeds, copy frontend URL, e.g. `https://roadledger.vercel.app`

---

## Part D — Connect both projects

1. Go to **backend** Vercel project → Settings → Environment Variables
2. Update:

```text
FRONTEND_ORIGIN=https://YOUR-FRONTEND.vercel.app
```

3. Redeploy backend
4. Open frontend URL → login/register

---

## Exact values for your current backend form

From your screenshot, change to:

- **Root Directory:** `backend` (OK for backend project)
- **Framework Preset:** Other / no Express build needed
- **Build Command override:** ON, value blank or `npm install`
- **Output Directory:** Off
- **Install Command:** Off
- **Environment Variables:** add `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `NODE_ENV=production`, etc.

Then Deploy.

---

## Seed admin user

After backend is live, either:

- Use `/register` in the frontend, or
- Run seed locally against Atlas:

```bash
cd backend
# put the same MONGODB_URI in .env
npm run seed
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `tsc: command not found` | Build Command override = `npm run vercel-build` |
| `FUNCTION_INVOCATION_FAILED` / 500 | 1) Set `MONGODB_URI` + `JWT_SECRET` in Vercel env 2) Atlas Network Access allow `0.0.0.0/0` 3) Redeploy latest code |
| `/api/health` 500 with Mongo error | Atlas IP allowlist or wrong URI/password |
| Frontend login fails | Set backend `FRONTEND_ORIGIN` to exact frontend Vercel URL and redeploy |
| CORS errors | Same as above; both must be HTTPS |
| Wrong project built | Backend root = `backend`, frontend root = `frontend` |

---

## Summary

1. Atlas DB ready  
2. Vercel project #1 → `backend` + env vars → test `/api/health`  
3. Vercel project #2 → `frontend` + `BACKEND_URL`  
4. Set backend `FRONTEND_ORIGIN` to frontend URL  
5. Redeploy backend and test login  
