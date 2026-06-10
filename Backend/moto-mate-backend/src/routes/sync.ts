import { Hono } from "hono";
import { tryGetDb } from "../db.js";

export const syncRouter = new Hono();

// POST /api/sync/save
syncRouter.post("/save", async (c) => {
  const body = await c.req.json<{ userId?: string; key?: string; value?: unknown }>();
  const { userId, key, value } = body;
  if (!userId || !key) return c.json({ error: "userId and key are required" }, 400);

  const db = await tryGetDb();
  if (!db) return c.json({ ok: true, offline: true }); // silent — local data still works

  await db.collection("user_data").updateOne(
    { userId, key },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true }
  );
  return c.json({ ok: true });
});

// POST /api/sync/load
syncRouter.post("/load", async (c) => {
  const body = await c.req.json<{ userId?: string }>();
  const { userId } = body;
  if (!userId || userId.length < 8) return c.json({ data: {} }); // return empty instead of error

  const db = await tryGetDb();
  if (!db) return c.json({ data: {} }); // offline — frontend keeps using localStorage

  const docs = await db
    .collection("user_data")
    .find({ userId })
    .project({ _id: 0, key: 1, value: 1 })
    .toArray();

  const data: Record<string, unknown> = {};
  for (const doc of docs) data[doc.key as string] = doc.value;
  return c.json({ data });
});

// POST /api/sync/delete
syncRouter.post("/delete", async (c) => {
  const body = await c.req.json<{ userId?: string }>();
  const { userId } = body;
  if (!userId || userId.length < 8) return c.json({ ok: true });

  const db = await tryGetDb();
  if (!db) return c.json({ ok: true, offline: true });

  await db.collection("user_data").deleteMany({ userId });
  return c.json({ ok: true });
});
