import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { tryGetDb } from "../db.js";

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "motoNav-change-this-in-prod");
}

export const authRouter = new Hono();

// POST /api/auth/register
authRouter.post("/register", async (c) => {
  const { email, password, riderName } = await c.req.json<{
    email?: string;
    password?: string;
    riderName?: string;
  }>();

  if (!email?.trim() || !password?.trim()) {
    return c.json({ error: "Email and password are required" }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters" }, 400);
  }

  const db = await tryGetDb();
  if (!db) {
    return c.json({ error: "Database unavailable — please check your MongoDB connection or use Continue as Guest" }, 503);
  }

  const existing = await db.collection("users").findOne({ email: email.toLowerCase().trim() });
  if (existing) return c.json({ error: "Email already registered" }, 409);

  const hashed = await bcrypt.hash(password, 10);
  const name = riderName?.trim() || "Rider";

  const { insertedId } = await db.collection("users").insertOne({
    email: email.toLowerCase().trim(),
    password: hashed,
    riderName: name,
    createdAt: new Date(),
  });

  const userId = insertedId.toString();
  const token = await new SignJWT({ userId, email: email.toLowerCase().trim(), riderName: name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(getSecret());

  return c.json({ token, userId, riderName: name, email: email.toLowerCase().trim() });
});

// POST /api/auth/login
authRouter.post("/login", async (c) => {
  const { email, password } = await c.req.json<{
    email?: string;
    password?: string;
  }>();

  if (!email?.trim() || !password?.trim()) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const db = await tryGetDb();
  if (!db) {
    return c.json({ error: "Database unavailable — please use Continue as Guest" }, 503);
  }

  const user = await db.collection("users").findOne({ email: email.toLowerCase().trim() });
  if (!user) return c.json({ error: "Invalid email or password" }, 401);

  const valid = await bcrypt.compare(password, user.password as string);
  if (!valid) return c.json({ error: "Invalid email or password" }, 401);

  const userId = (user._id as object).toString();
  const token = await new SignJWT({ userId, email: user.email as string, riderName: user.riderName as string })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(getSecret());

  return c.json({ token, userId, riderName: user.riderName as string, email: user.email as string });
});

// POST /api/auth/verify
authRouter.post("/verify", async (c) => {
  const { token } = await c.req.json<{ token?: string }>();
  if (!token) return c.json({ valid: false }, 400);

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return c.json({ valid: true, userId: payload.userId, riderName: payload.riderName, email: payload.email });
  } catch {
    return c.json({ valid: false }, 401);
  }
});
