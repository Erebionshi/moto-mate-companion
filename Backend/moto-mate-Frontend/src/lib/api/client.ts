// HTTP client for the moto-mate-backend REST API.
// Set VITE_API_URL in .env.local to point at your backend (default: localhost:3001).

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type WeatherData = {
  temp: number;
  cond: string;
  icon: string;
  wind: number;
  humidity: number;
  riding: "GOOD" | "CAUTION" | "AVOID";
  location: string;
  forecast: { t: string; temp: number; icon: string }[];
};

export type AskParams = {
  question: string;
  brand: string;
  model: string;
  year: number;
  odometer: number;
  overdueItems: string[];
  dueSoonItems: string[];
};

export type AuthResponse = {
  token: string;
  userId: string;
  riderName: string;
  email: string;
};

export type PlaceResult = {
  id: number;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
};

export type RouteResult = {
  waypoints: { instr: string; arrow: "LEFT" | "RIGHT" | "STRAIGHT" | "UTURN"; dist: number }[];
  geometry: [number, number][];
  distance: string;
  durationMin: number;
};

// ── API client ────────────────────────────────────────────────────────────────

export const apiClient = {
  sync: {
    save: (userId: string, key: string, value: unknown) =>
      post<{ ok: boolean }>("/api/sync/save", { userId, key, value }),
    load: (userId: string) =>
      post<{ data: Record<string, unknown> }>("/api/sync/load", { userId }),
    delete: (userId: string) =>
      post<{ ok: boolean }>("/api/sync/delete", { userId }),
  },

  weather: {
    /** GPS coords preferred; falls back to city name */
    get: (city: string, coords?: [number, number] | null) =>
      post<WeatherData>("/api/weather", coords ? { lat: coords[0], lng: coords[1] } : { city }),
  },

  ai: {
    ask: (params: AskParams) => post<{ answer: string }>("/api/ai/ask", params),
  },

  auth: {
    register: (email: string, password: string, riderName: string) =>
      post<AuthResponse>("/api/auth/register", { email, password, riderName }),
    login: (email: string, password: string) =>
      post<AuthResponse>("/api/auth/login", { email, password }),
    verify: (token: string) =>
      post<{ valid: boolean; userId?: string; riderName?: string; email?: string }>(
        "/api/auth/verify",
        { token }
      ),
  },

  places: {
    search: (query: string) =>
      post<{ results: PlaceResult[] }>("/api/places/search", { query }),
    route: (params: { originLat: number; originLng: number; destLat: number; destLng: number }) =>
      post<RouteResult>("/api/places/route", params),
  },
};
