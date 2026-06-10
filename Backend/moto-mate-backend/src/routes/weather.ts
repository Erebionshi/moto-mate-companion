import { Hono } from "hono";

const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";

function wmoToCondition(code: number): { cond: string; icon: string } {
  if (code === 0) return { cond: "Clear", icon: "Sun" };
  if (code <= 3) return { cond: "Partly Cloudy", icon: "Cloud" };
  if (code <= 48) return { cond: "Cloudy", icon: "Cloud" };
  if (code <= 67) return { cond: "Light Rain", icon: "CloudRain" };
  if (code <= 77) return { cond: "Light Rain", icon: "CloudSnow" };
  if (code <= 82) return { cond: "Light Rain", icon: "CloudRain" };
  if (code <= 86) return { cond: "Light Rain", icon: "CloudSnow" };
  return { cond: "Stormy", icon: "CloudLightning" };
}

function condToRiding(cond: string): "GOOD" | "CAUTION" | "AVOID" {
  if (cond === "Clear" || cond === "Partly Cloudy") return "GOOD";
  if (cond === "Cloudy") return "CAUTION";
  return "AVOID";
}

export const weatherRouter = new Hono();

// POST /api/weather  { city?: string, lat?: number, lng?: number }
// If lat/lng provided (GPS), skip geocoding and reverse-geocode for display name.
weatherRouter.post("/", async (c) => {
  const body = await c.req.json<{ city?: string; lat?: number; lng?: number }>();

  let lat = 14.5995, lon = 120.9842, locationName = "Manila";

  if (body.lat != null && body.lng != null) {
    // ── GPS mode: use coordinates directly ───────────────────────────────────
    lat = body.lat;
    lon = body.lng;
    try {
      const rRes = await fetch(
        `${NOMINATIM}?lat=${lat}&lon=${lon}&format=json&zoom=14`,
        { headers: { "User-Agent": "MotoNav-App/1.0 (contact@motonav.app)" } }
      );
      if (rRes.ok) {
        const rData = await rRes.json() as {
          address?: { suburb?: string; village?: string; town?: string; city?: string; municipality?: string };
        };
        const a = rData.address ?? {};
        locationName = a.suburb ?? a.village ?? a.town ?? a.city ?? a.municipality ?? "Current Location";
      } else {
        locationName = "Current Location";
      }
    } catch {
      locationName = "Current Location";
    }
  } else {
    // ── City-name mode: geocode to get coordinates ────────────────────────────
    const city = body.city?.trim();
    if (!city) return c.json({ error: "city or coordinates required" }, 400);
    locationName = city;

    try {
      const geoRes = await fetch(
        `${GEO_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json() as {
          results?: { latitude: number; longitude: number; name: string }[];
        };
        if (geoData.results?.length) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
          locationName = geoData.results[0].name;
        }
      }
    } catch {}
  }

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code",
    forecast_days: "1",
    timezone: "auto",
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
  });

  const fRes = await fetch(`${FORECAST_API}?${params}`);
  if (!fRes.ok) return c.json({ error: `Open-Meteo error: ${fRes.status}` }, 502);

  const fData = await fRes.json() as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
    hourly?: { temperature_2m?: number[]; weather_code?: number[] };
  };

  const temp = Math.round(fData.current?.temperature_2m ?? 28);
  const humidity = Math.round(fData.current?.relative_humidity_2m ?? 65);
  const wind = Math.round(fData.current?.wind_speed_10m ?? 10);
  const code = fData.current?.weather_code ?? 0;
  const { cond, icon } = wmoToCondition(code);
  const riding = condToRiding(cond);

  const now = new Date().getHours();
  const hourlyTemps = fData.hourly?.temperature_2m ?? [];
  const hourlyCodes = fData.hourly?.weather_code ?? [];
  const forecast = [1, 2, 3].map((offset) => {
    const h = (now + offset) % 24;
    const { icon: fi } = wmoToCondition(hourlyCodes[h] ?? code);
    return { t: `+${offset}h`, temp: Math.round(hourlyTemps[h] ?? temp), icon: fi };
  });

  return c.json({ temp, cond, icon, wind, humidity, riding, location: locationName, forecast });
});
