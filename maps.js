export async function getRouteMinutes({
  origin,
  destination,
  mode = "DRIVE",
  routingPreference = "TRAFFIC_AWARE"
}) {
  const apiKey = process.env.MAPS_API_KEY;
  if (!apiKey) throw new Error("MAPS_API_KEY is not set");

  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const body = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: mode,                 // DRIVE | WALK | BICYCLE | TRANSIT
    routingPreference                 // TRAFFIC_AWARE | TRAFFIC_AWARE_OPTIMAL (DRIVE only)
  };

  // Routing preference only makes sense for driving
  if (mode !== "DRIVE") {
    delete body.routingPreference;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Routes API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const durStr = data.routes?.[0]?.duration; // e.g. "123s"
  if (!durStr) throw new Error("No duration returned from Routes API");

  const seconds = Number(durStr.replace("s", ""));
  return Math.max(0, Math.round(seconds / 60));
}

export async function buildTravelMinutes(legs, { mode = "DRIVE" } = {}) {
  const out = {};
  for (const leg of legs) {
    const mins = await getRouteMinutes({
      origin: leg.origin,
      destination: leg.destination,
      mode
    });
    out[`${leg.from}_${leg.to}`] = mins;
  }
  return out;
}