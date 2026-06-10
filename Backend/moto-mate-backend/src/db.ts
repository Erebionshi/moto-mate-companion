import { MongoClient, type Db } from "mongodb";

let _client: MongoClient | null = null;
let _lastError: Date | null = null;
const RETRY_COOLDOWN_MS = 30_000; // don't spam reconnects — wait 30s between attempts

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  // If a recent connection attempt already failed, don't retry yet
  if (_lastError && Date.now() - _lastError.getTime() < RETRY_COOLDOWN_MS) {
    throw new Error("MongoDB unavailable (in cooldown after failed attempt)");
  }

  // If we have a client, make sure it's still alive
  if (_client) {
    try {
      await _client.db("admin").command({ ping: 1 });
      return _client.db("motoNav");
    } catch {
      await _client.close().catch(() => {});
      _client = null;
    }
  }

  // Fresh connection attempt
  const client = new MongoClient(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 6000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 30000,
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 }); // confirm it actually works
  } catch (err) {
    await client.close().catch(() => {});
    _lastError = new Date();
    throw err;
  }

  _client = client;
  _lastError = null;

  // Indexes — fire and forget
  const db = _client.db("motoNav");
  db.collection("user_data").createIndex({ userId: 1, key: 1 }, { unique: true }).catch(() => {});
  db.collection("users").createIndex({ email: 1 }, { unique: true }).catch(() => {});

  return db;
}

/** Returns null instead of throwing — use in routes that can degrade gracefully */
export async function tryGetDb(): Promise<Db | null> {
  try {
    return await getDb();
  } catch {
    return null;
  }
}
