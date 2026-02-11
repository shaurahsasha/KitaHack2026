import { runPlanner } from "./planner.js";
import { runSafetyDecision } from "./safety.js";
import { getRouteMinutes } from "./maps.js";

console.log("Routine AI started");

try {
  const { result: planResult } = await runPlanner();
  console.log("PLANNER RESULT:", planResult);

  const { result: safetyResult } = await runSafetyDecision();
  console.log("SAFETY RESULT:", safetyResult);
} catch (err) {
  console.error("Error:", err?.message || err);
}

// const mins = await getRouteMinutes({
//   origin: "AEON Mall Nilai",
//   destination: "MesaMall Nilai"
// });

// console.log("Minutes:", mins);