import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { syncRouter } from "./routes/sync.js";
import { weatherRouter } from "./routes/weather.js";
import { aiRouter } from "./routes/ai.js";
import { authRouter } from "./routes/auth.js";
import { placesRouter } from "./routes/places.js";

const app = new Hono();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return origin; // allow Postman / curl (no Origin header)
      // Allow any localhost / 127.0.0.1 port in development
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
      // In production, restrict to the configured frontend URL
      const allowed = process.env.FRONTEND_URL;
      return allowed && origin === allowed ? origin : null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);
app.use("/*", logger());

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ status: "ok", service: "moto-mate-backend", version: "2.0.0" })
);

app.route("/api/sync", syncRouter);
app.route("/api/weather", weatherRouter);
app.route("/api/ai", aiRouter);
app.route("/api/auth", authRouter);
app.route("/api/places", placesRouter);

// ── Start ────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`\n  MotoNav backend running → http://localhost:${port}\n`);
  console.log(`  MongoDB:  ${process.env.MONGODB_URI ? "✓ configured" : "✗ MONGODB_URI not set"}`);
  console.log(`  Groq AI:  ${process.env.GROQ_API_KEY ? "✓ configured" : "✗ GROQ_API_KEY not set (get free key at console.groq.com)"}`);
  console.log(`  JWT:      ${process.env.JWT_SECRET ? "✓ configured" : "⚠  JWT_SECRET not set — using default (change for production!)"}`);
  console.log(`  CORS:     ${process.env.FRONTEND_URL ?? "*"}\n`);
});
