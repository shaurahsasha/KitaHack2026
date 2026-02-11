import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function callGeminiJson({
  model,
  fallbackModel,
  systemInstruction,
  schema,
  payload,
  maxRetries = 3
}) {
  const contents = JSON.stringify(payload);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      // SDK returns JSON string in resp.text
      const raw = resp.text?.trim?.() ?? "";
        try {
          return JSON.parse(raw);
        } catch (e) {
          // show the raw output so we can debug immediately
          throw new Error("Gemini returned non-JSON:\n" + raw);
        }

    } catch (err) {
      const status = err?.status;
      const isRetryable = status === 429 || status === 500 || status === 503;

      // last attempt -> try fallback model once if provided
      if (attempt === maxRetries) {
        if (fallbackModel && fallbackModel !== model) {
          const resp2 = await ai.models.generateContent({
            model: fallbackModel,
            contents,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: schema
            }
          });
          const raw = resp2.text?.trim?.() ?? "";
            try {
              return JSON.parse(raw);
            } catch (e) {
              // show the raw output so we can debug immediately
              throw new Error("Gemini returned non-JSON:\n" + raw);
            }
        }
        throw err;
      }

      if (!isRetryable) throw err;

      // exponential-ish backoff
      await sleep(400 * (attempt + 1));
    }
  }
}
