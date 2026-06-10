# MotoNav — Backend Setup Guide

## Architecture

```
M&J/
├── moto-mate-companion/   ← React frontend (TanStack Start)
│   └── src/lib/api/client.ts  calls →
└── moto-mate-backend/     ← Node.js REST API (Hono)
    ├── MongoDB Atlas       ← data + accounts (free M0 cluster)
    ├── Open-Meteo          ← weather (free, no key)
    ├── Groq / Llama 3      ← AI mechanic chat (free, 14,400 req/day)
    ├── Nominatim           ← place search (free, no key)
    └── OSRM                ← turn-by-turn routing (free, no key)
```

---

## Step 1 — MongoDB Atlas (free M0 cluster)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Create account** (free)
2. **Create a cluster** → choose **M0 Free** → any region → name anything
3. **Database Access** → Add database user:
   - Username: `motonavuser`  
   - Password: (generate something strong)  
   - Role: **Read and write to any database**
4. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`)
5. **Clusters** → **Connect** → **Drivers** → Node.js → copy the URI

Edit `moto-mate-backend/.env`:
```
MONGODB_URI=mongodb+srv://motonavuser:YOURPASSWORD@cluster0.xxxxx.mongodb.net/motoNav?retryWrites=true&w=majority
```

> The database `motoNav` is created automatically on first write.

---

## Step 2 — Groq AI (free, no credit card)

1. Go to [console.groq.com](https://console.groq.com) → sign in with Google
2. **API Keys** → **Create API Key** → copy it

Edit `moto-mate-backend/.env`:
```
GROQ_API_KEY=gsk_...
```

**Free quota**: 14,400 requests/day, 30 requests/minute — plenty for personal use.  
Uses **Llama 3.1 8B** — fast and capable for motorcycle mechanic Q&A.

---

## Step 3 — JWT Secret

Change the default secret to any long random string:
```
JWT_SECRET=my-super-secret-key-change-this-in-production
```

---

## Step 4 — Weather / Maps / Routing (no setup)

| Service | Usage | Key needed? |
|---------|-------|-------------|
| Open-Meteo | Real-time weather | No |
| Nominatim | Place name search | No |
| OSRM | Turn-by-turn routing | No |
| CartoDB Dark | Map tiles | No |

---

## Step 5 — Run locally

```bash
# Terminal 1 — backend
cd moto-mate-backend
npm install
npm run dev
# → http://localhost:3001

# Terminal 2 — frontend
cd moto-mate-companion
bun run dev
# → http://localhost:5173
```

---

## Features

### Login / Register
- Sign up with email + password → JWT stored in localStorage
- "Continue as guest" option (no account needed)
- Auth token persists across sessions

### Navigate tab
1. Type a destination → Nominatim search results appear
2. Select a place → real GPS + OSRM route is calculated
3. Map shows dark CartoDB tiles with your location, the destination pin, and the blue route line
4. Press **START NAVIGATION** to begin with real turn-by-turn instructions
5. If no GPS / no backend, falls back to simulated ride

### AI Mechanic
- Uses **Groq Llama 3.1** (free, no card) instead of Gemini
- Answers motorcycle maintenance questions with bike context

---

## Production deployment (all free)

| Service | Platform |
|---------|----------|
| Backend | [Railway](https://railway.app) or [Render](https://render.com) |
| Frontend | Lovable / Cloudflare Pages |

Set `FRONTEND_URL` in the backend env to your production frontend URL for CORS.
