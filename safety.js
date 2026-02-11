import { callGeminiJson } from "./gemini-client.js";

export async function runSafetyDecision() {
  const safetyInput = {
    timezone: "Asia/Kuala_Lumpur",
    childName: "Debby",
    expectedStop: {
      type: "DAYCARE_DROPOFF",
      place: "DAYCARE",
      mustArriveByISO: "2026-02-06T07:33:00+08:00"
    },
    geofenceLog: [
      { type: "ENTER", place: "OFFICE", timeISO: "2026-02-06T07:55:00+08:00" }
      // no DAYCARE entry -> anomaly
    ],
    nowISO: "2026-02-06T08:02:00+08:00",
    policy: {
      graceMinutesAfterDeadline: 10,
      ifOfficeEnteredBeforeDaycare: "escalate"
    }
  };

  const safetySchema = {
    type: "object",
    properties: {
      shouldAlert: { type: "boolean" },
      severity: { type: "string", enum: ["INFO", "WARN", "URGENT"] },
      title: { type: "string" },
      body: { type: "string" },
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "string", enum: ["CONFIRM_DROPPED", "NOT_YET", "SKIP_TODAY"] }
          },
          required: ["label", "value"]
        }
      }
    },
    required: ["shouldAlert", "severity", "title", "body", "actions"]
  };

  const safetySystemInstruction =
    "You are a safety decision engine. Output ONLY valid JSON matching the schema. " +
    "Decide if daycare drop-off was likely missed based on expectedStop.mustArriveByISO and geofenceLog. " +
    "If OFFICE entered after deadline+grace and DAYCARE never entered, shouldAlert=true. " +
    "Severity: INFO if within grace, WARN if moderately late, URGENT if clearly late and office was entered. " +
    "Include 3 actions: Dropped off, Not yet, Skip today." +
    "Return ONLY JSON. Do not include any extra text before or after the JSON.";

  const result = await callGeminiJson({
    model: "gemini-3-flash-preview",
    fallbackModel: "gemini-1.5-flash",
    systemInstruction: safetySystemInstruction,
    schema: safetySchema,
    payload: safetyInput,
    maxRetries: 3
  });

  return { safetyInput, result };
}
