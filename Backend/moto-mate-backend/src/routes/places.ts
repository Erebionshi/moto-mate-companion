import { Hono } from "hono";

export const placesRouter = new Hono();

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
};

type OsrmRoute = {
  code: string;
  routes?: Array<{
    geometry: { coordinates: number[][] };
    legs?: Array<{
      steps?: Array<{
        maneuver: { type: string; modifier?: string };
        name: string;
        distance: number;
        duration: number;
      }>;
      distance: number;
      duration: number;
    }>;
    distance: number;
    duration: number;
  }>;
};

// POST /api/places/search  { query: string }
placesRouter.post("/search", async (c) => {
  const { query } = await c.req.json<{ query?: string }>();
  if (!query?.trim()) return c.json({ results: [] });

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query.trim())}` +
    `&format=json&limit=6&addressdetails=0`;

  const res = await fetch(url, {
    headers: { "User-Agent": "MotoNav-App/1.0 (contact@motonav.app)" },
  });
  if (!res.ok) return c.json({ results: [] });

  const data = (await res.json()) as NominatimResult[];

  const results = data.map((r) => ({
    id: r.place_id,
    name: r.display_name.split(",").slice(0, 2).join(",").trim(),
    fullName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));

  return c.json({ results });
});

// POST /api/places/route  { originLat, originLng, destLat, destLng }
placesRouter.post("/route", async (c) => {
  const { originLat, originLng, destLat, destLng } = await c.req.json<{
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
  }>();

  if (originLat == null || originLng == null || destLat == null || destLng == null) {
    return c.json({ error: "All coordinates (originLat/Lng, destLat/Lng) required" }, 400);
  }

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}` +
    `?steps=true&geometries=geojson&overview=full`;

  const res = await fetch(url);
  if (!res.ok) return c.json({ error: "Routing service unavailable" }, 502);

  const data = (await res.json()) as OsrmRoute;
  if (data.code !== "Ok" || !data.routes?.length) {
    return c.json({ error: "No route found" }, 404);
  }

  const route = data.routes[0];
  // OSRM coords are [lng, lat] — flip to [lat, lng] for Leaflet
  const geometry = route.geometry.coordinates.map(
    ([lng, lat]) => [lat, lng] as [number, number]
  );

  type ArrowKey = "LEFT" | "RIGHT" | "STRAIGHT" | "UTURN";

  function toArrow(type: string, modifier?: string): ArrowKey {
    if (type === "arrive") return "STRAIGHT";
    if (type === "turn") {
      if (modifier?.includes("left")) return "LEFT";
      if (modifier?.includes("right")) return "RIGHT";
      if (modifier === "uturn") return "UTURN";
    }
    return "STRAIGHT";
  }

  function toInstruction(type: string, modifier: string | undefined, name: string): string {
    const road = name || "road";
    if (type === "arrive") return `Arrive at destination`;
    if (type === "depart") return `Head ${modifier ?? "forward"} on ${road}`;
    if (type === "turn") return `Turn ${modifier ?? "straight"} onto ${road}`;
    if (type === "merge") return `Merge onto ${road}`;
    if (type === "roundabout") return `Enter roundabout, take exit onto ${road}`;
    return `Continue ${modifier ?? "straight"} on ${road}`;
  }

  const steps = (route.legs?.[0]?.steps ?? []).map((step) => ({
    instr: toInstruction(step.maneuver.type, step.maneuver.modifier, step.name),
    arrow: toArrow(step.maneuver.type, step.maneuver.modifier),
    dist: Math.round(step.distance),
  }));

  return c.json({
    waypoints: steps,
    geometry,
    distance: (route.distance / 1000).toFixed(1),
    durationMin: Math.round(route.duration / 60),
  });
});
