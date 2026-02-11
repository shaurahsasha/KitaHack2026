console.log("✅ Routine AI script started");

// 1) Define a Schedule Item
class ScheduleItem {
  constructor({ id, type, title, place, startTime, latestArrival, bufferBeforeMin, departureTime, arriveBeforeHours }) {
    this.id = id;
    this.type = type; // TASK, EVENT, FLIGHT
    this.title = title;
    this.place = place;
    this.startTime = startTime;
    this.latestArrival = latestArrival;
    this.bufferBeforeMin = bufferBeforeMin;
    this.departureTime = departureTime;
    this.arriveBeforeHours = arriveBeforeHours;
  }
}

// 2) Planner Engine
class PlannerEngine {
  constructor(travelMinutes) {
    this.travelMinutes = travelMinutes;
  }

  toMinutes(t) {
    const [hm, ampm] = t.trim().split(" ");
    let [h, m] = hm.split(":").map(Number);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  toTimeStr(totalMin) {
    let h24 = Math.floor(totalMin / 60);
    let m = totalMin % 60;
    if (m < 0) m = 0;
    const ampm = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    const mm = String(m).padStart(2, "0");
    return `${h12}:${mm} ${ampm}`;
  }

  getArriveBy(item, rules = {}) {
    if (item.type === "TASK") return this.toMinutes(item.latestArrival);
    if (item.type === "EVENT") return this.toMinutes(item.startTime) - (item.bufferBeforeMin ?? rules.defaultMeetingBufferMin ?? 15);
    if (item.type === "FLIGHT") return this.toMinutes(item.departureTime) - (item.arriveBeforeHours ?? rules.flightArriveBeforeHours ?? 4) * 60;
    throw new Error(`Unknown item type: ${item.type}`);
  }

  getTravelMin(fromPlace, toPlace) {
    const key = `${fromPlace}_${toPlace}`;
    const mins = this.travelMinutes[key];
    if (mins == null) throw new Error(`Missing travel minutes for ${key}`);
    return mins;
  }

  computePlan({ startPlace, items, rules = {} }) {
    const sorted = [...items].sort((a, b) => this.getArriveBy(a, rules) - this.getArriveBy(b, rules));

    // Backward constraints
    let nextArriveBy = this.getArriveBy(sorted[sorted.length - 1], rules);
    let nextPlace = sorted[sorted.length - 1].place;

    // Compute first stop constraint by chaining backwards (only 2 stops in this test is fine)
    for (let i = sorted.length - 2; i >= 0; i--) {
      const thisPlace = sorted[i].place;
      const legTravel = this.getTravelMin(thisPlace, nextPlace);
      const latestDepartThisStop = nextArriveBy - legTravel;
      const thisArriveBy = Math.min(this.getArriveBy(sorted[i], rules), latestDepartThisStop);
      nextArriveBy = thisArriveBy;
      nextPlace = thisPlace;
    }

    // Leave time from startPlace to first stop
    const firstStop = sorted[0];
    const travelStartToFirst = this.getTravelMin(startPlace, firstStop.place);
    const leaveStartBy = nextArriveBy - travelStartToFirst;

    return { leaveStartBy: this.toTimeStr(leaveStartBy), ordered: sorted.map(x => x.title) };
  }
}

// ===== Main =====
try {
  const planner = new PlannerEngine({
    "HOME_Daycare": 18,
    "Daycare_Office": 42
  });

  const items = [
    new ScheduleItem({
      id: "dropoff",
      type: "TASK",
      title: "Send Debby to daycare",
      place: "Daycare",
      latestArrival: "07:45 AM"
    }),
    new ScheduleItem({
      id: "meeting",
      type: "EVENT",
      title: "Meeting with clients",
      place: "Office",
      startTime: "08:30 AM",
      bufferBeforeMin: 15
    })
  ];

  const rules = { defaultMeetingBufferMin: 15, flightArriveBeforeHours: 4 };

  const result = planner.computePlan({ startPlace: "HOME", items, rules });
  console.log("✅ Leave start by:", result.leaveStartBy);
  console.log("✅ Ordered:", result.ordered);
} catch (err) {
  console.error("❌ Error:", err.message);
}