/**
 * Route Optimizer — Nearest-Neighbor + 2-opt VRP
 *
 * Replaces the original C# RoutePlanner.SolutionOptimizer library.
 * Distributes jobs across working days in the planning period and
 * optimizes the visit order within each day.
 */

// ─── JobType enum (matches TypeScript IJobDisposition.JobType) ────────────────
const JobType = {
  RegularJob: 0,
  FixedAppointment: 1,
  StartPoint: 3,
  EndPoint: 4,
  HomeStartPoint: 5,
  HomeEndPoint: 6,
};

// ─── UndispatchableReason enum ────────────────────────────────────────────────
const UndispatchableReason = {
  NoTime: 0,
  NotValidCoordinates: 1,
  JobDuration: 2,
};

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function haversine(a, b) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ─── Nearest-neighbor tour from a start point ─────────────────────────────────
function nearestNeighbor(start, jobs) {
  const unvisited = [...jobs];
  const route = [];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversine(current, unvisited[i].coords);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = unvisited.splice(nearestIdx, 1)[0];
    route.push(next);
    current = next.coords;
  }
  return route;
}

// ─── 2-opt improvement (start is fixed) ──────────────────────────────────────
function twoOpt(start, route) {
  if (route.length < 3) return route;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const a = i === 0 ? start : route[i - 1].coords;
        const b = route[i].coords;
        const c = route[j].coords;
        const d = j + 1 < route.length ? route[j + 1].coords : null;

        const before = haversine(a, b) + (d ? haversine(c, d) : 0);
        const after = haversine(a, c) + (d ? haversine(b, d) : 0);

        if (after < before - 0.001) {
          route.splice(i, j - i + 1, ...route.slice(i, j + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return route;
}

// ─── Build one IJobDisposition entry ─────────────────────────────────────────
function toCoords(c) {
  if (!c) return { Latitude: null, Longitude: null };
  // accept either { latitude, longitude } (Azure Maps) or { Latitude, Longitude }
  return {
    Latitude:  c.Latitude  ?? c.latitude  ?? null,
    Longitude: c.Longitude ?? c.longitude ?? null,
  };
}

function makeDisposition(job, workerCoords, type, workerId, startDate, endDate) {
  return {
    Job: {
      Id: job.Id,
      IsWorkerHomeStartPoint: type === JobType.HomeStartPoint,
      IsJobStartPoint: type === JobType.StartPoint,
      IsFixedAppointment: type === JobType.FixedAppointment,
      IsHomeEndPoint: type === JobType.HomeEndPoint,
      IsJobEndPoint: type === JobType.EndPoint,
      Duration: new Date(job.durationMinutes * 60 * 1000).toISOString(),
      Coordinates: toCoords(job.coords || workerCoords),
      Type: type,
      ReferenceId: job.Id,
    },
    Worker: { Id: workerId, Name: `Worker ${workerId}` },
    StartDate: startDate.toISOString(),
    EndDate: endDate.toISOString(),
  };
}

// ─── Main optimizer ───────────────────────────────────────────────────────────
function optimize(context) {
  const { Workers, OptimizationParams } = context;

  // All jobs with geocoded coordinates
  const validJobs = context.Jobs.filter((j) => j.coords);
  const invalidJobs = context.Jobs.filter((j) => !j.coords);

  if (!Workers || Workers.length === 0) {
    return {
      JobDispositions: [],
      NotDispatchableJobs: invalidJobs.map((j) => ({
        Job: { Id: j.Id, ReferenceId: j.Id, Type: JobType.RegularJob, Coordinates: null },
        Reason: UndispatchableReason.NotValidCoordinates,
      })),
      State: 0,
    };
  }

  const worker = Workers[0];
  const workerCoords = worker.coords;
  const workerId = '0';

  // Build a lookup: dayOfWeek → { startHour, startMin, endHour, endMin }
  const workingSchedule = {};
  for (const wt of worker.WorkingTimes || []) {
    const startDate = new Date(wt.WorkingStartDate);
    const endDate = new Date(wt.WorkingEndDate);
    workingSchedule[wt.Day] = {
      startHour: startDate.getUTCHours(),
      startMin: startDate.getUTCMinutes(),
      endHour: endDate.getUTCHours(),
      endMin: endDate.getUTCMinutes(),
    };
  }

  // Collect all working dates in the planning period
  const planStart = new Date(OptimizationParams.PlanningPeriodStartDate);
  const planEnd = new Date(OptimizationParams.PlanningPeriodEndDate);
  const workingDates = [];
  const cursor = new Date(planStart);
  while (cursor <= planEnd) {
    const dow = cursor.getDay(); // 0=Sun … 6=Sat
    if (workingSchedule[dow]) {
      workingDates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Distribute jobs greedily across working days using nearest-neighbor
  const remaining = [...validJobs];
  const jobsByDay = workingDates.map(() => []);

  for (let dayIdx = 0; dayIdx < workingDates.length && remaining.length > 0; dayIdx++) {
    const dow = workingDates[dayIdx].getDay();
    const schedule = workingSchedule[dow];
    const availMinutes =
      schedule.endHour * 60 + schedule.endMin - (schedule.startHour * 60 + schedule.startMin);

    let usedMinutes = 0;
    let currentCoords = workerCoords;

    // Greedily pick nearest job that still fits in the day
    let progress = true;
    while (progress && remaining.length > 0) {
      progress = false;
      let nearestIdx = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const job = remaining[i];
        if (usedMinutes + job.durationMinutes > availMinutes) continue;
        const d = haversine(currentCoords, job.coords);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }

      if (nearestIdx >= 0) {
        const job = remaining.splice(nearestIdx, 1)[0];
        jobsByDay[dayIdx].push(job);
        usedMinutes += job.durationMinutes;
        currentCoords = job.coords;
        progress = true;
      }
    }

    // 2-opt improvement within the day
    twoOpt(workerCoords, jobsByDay[dayIdx]);
  }

  // Build IJobDisposition list
  const dispositions = [];

  for (let dayIdx = 0; dayIdx < workingDates.length; dayIdx++) {
    const dayJobs = jobsByDay[dayIdx];
    if (dayJobs.length === 0) continue;

    const date = workingDates[dayIdx];
    const dow = date.getDay();
    const schedule = workingSchedule[dow];

    // Current clock = working start time for this day
    const clock = new Date(date);
    clock.setUTCHours(schedule.startHour, schedule.startMin, 0, 0);

    // Home start point
    const homeStart = new Date(clock);
    dispositions.push(
      makeDisposition(
        { Id: `home-start-day${dayIdx}`, durationMinutes: 0, coords: workerCoords },
        workerCoords,
        JobType.HomeStartPoint,
        workerId,
        homeStart,
        homeStart
      )
    );

    for (const job of dayJobs) {
      const startDate = new Date(clock);
      clock.setMinutes(clock.getMinutes() + job.durationMinutes);
      const endDate = new Date(clock);
      dispositions.push(
        makeDisposition(job, workerCoords, JobType.RegularJob, workerId, startDate, endDate)
      );
    }

    // Home end point (always added — frontend uses it for roundtrip display)
    if (OptimizationParams.Roundtrip) {
      const homeEnd = new Date(clock);
      dispositions.push(
        makeDisposition(
          { Id: `home-end-day${dayIdx}`, durationMinutes: 0, coords: workerCoords },
          workerCoords,
          JobType.HomeEndPoint,
          workerId,
          homeEnd,
          homeEnd
        )
      );
    }
  }

  // Build NotDispatchableJobs
  const notDispatchable = [
    ...remaining.map((j) => ({
      Job: {
        Id: j.Id,
        ReferenceId: j.Id,
        Coordinates: toCoords(j.coords),
        Type: JobType.RegularJob,
        Duration: new Date(j.durationMinutes * 60 * 1000).toISOString(),
        IsWorkerHomeStartPoint: false,
        IsJobStartPoint: false,
        IsFixedAppointment: false,
        IsHomeEndPoint: false,
        IsJobEndPoint: false,
      },
      Reason: UndispatchableReason.NoTime,
    })),
    ...invalidJobs.map((j) => ({
      Job: {
        Id: j.Id,
        ReferenceId: j.Id,
        Coordinates: null,
        Type: JobType.RegularJob,
        Duration: new Date((j.Duration || 30) * 60 * 1000).toISOString(),
        IsWorkerHomeStartPoint: false,
        IsJobStartPoint: false,
        IsFixedAppointment: false,
        IsHomeEndPoint: false,
        IsJobEndPoint: false,
      },
      Reason: UndispatchableReason.NotValidCoordinates,
    })),
  ];

  return {
    JobDispositions: dispositions,
    NotDispatchableJobs: notDispatchable,
    State: 0, // Successful
  };
}

module.exports = { optimize, JobType, UndispatchableReason };
