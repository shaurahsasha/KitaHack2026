import { callGeminiJson } from "./gemini-client.js";
import { buildTravelMinutes } from "./maps.js";

export async function runPlanner() {
  const travelMode = "DRIVE";

  const places = {
    HOME: "Bukit Mahkota Club House",
    DAYCARE: "White Lodge Bangsar South International Preschool",
    OFFICE: "Pantai Hospital Kuala Lumpur"
  };

  const stops = [
    { type: "TASK", title: "Send Debby to daycare", place: "DAYCARE", latestArrivalISO: "2026-02-06T07:45:00+08:00" },
    { type: "EVENT", title: "Meeting with clients", place: "OFFICE", startISO: "2026-02-06T08:30:00+08:00" }
  ];

  const legs = buildLegs({ startPlaceKey: "HOME", stops, places });
  const travelMinutes = await buildTravelMinutes(legs, { mode: travelMode });

  const planInput = {
    timezone: "Asia/Kuala_Lumpur",
    now: { time: "2026-02-06T05:30:00+08:00", place: "HOME" },
    rules: { meetingBufferMin: 15, flightArriveBeforeHours: 3 },
    places,
    stops,
    travelMode,
    travelMinutes,
    notifyLeadMinutes: [120, 60, 0]
  };

  const responseSchema = {
    type: "object",
    properties: {
      departAtISO: { type: "string" },
      summary: { type: "string" },
      alerts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sendAtISO: { type: "string" },
            title: { type: "string" },
            body: { type: "string" }
          },
          required: ["sendAtISO", "title", "body"]
        }
      }
    },
    required: ["departAtISO", "summary","alerts"]
  };

  const systemInstruction =
    "You are Routine AI. Output ONLY valid JSON matching the schema. " +
    "Choose departAtISO that satisfies all stop constraints using travelMinutes and rules. " +
    "EVENT: arrive by (startISO - meetingBufferMin). TASK: arrive by latestArrivalISO. " +
    "FLIGHT: arrive by (departureISO - flightArriveBeforeHours). " +
    "Then generate alerts at departAtISO minus notifyLeadMinutes (include leave-now at departAtISO)." +
    "Alerts must summarize the route chain: first stop + final critical event (meeting/flight) and the reason for the depart time." +
    "Return ONLY JSON. Do not include any extra text before or after the JSON.";

  const result = await callGeminiJson({
    model: "gemini-3-flash-preview",
    fallbackModel: "gemini-1.5-flash",
    systemInstruction,
    schema: responseSchema,
    payload: planInput,
    maxRetries: 3
  });

  return { planInput, result };
}

function buildLegs({ startPlaceKey, stops, places }) {
  const legs = [];
  let prevKey = startPlaceKey;

  for (const stop of stops) {
    const toKey = stop.place; 
    legs.push({
      from: prevKey,
      to: toKey,
      origin: places[prevKey],
      destination: places[toKey]
    });
    prevKey = toKey;
  }

  return legs;
}
