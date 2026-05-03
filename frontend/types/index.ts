// ─── User Settings ────────────────────────────────────────────────────────────
export interface UserSettings {
  username: string
  street: string
  postalCode: string
  city: string
  country: string
  workingStartTime: string // HH:mm
  workingEndTime: string   // HH:mm
  workingDays: number[]    // 0=Sun … 6=Sat
  calendarName?: string
  dynamicsUrl?: string
  reminderThreshold?: number
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
export interface GraphContact {
  id: string
  displayName?: string
  givenName?: string
  surname?: string
  jobTitle?: string
  companyName?: string
  department?: string
  personalNotes?: string
  businessAddress?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    countryOrRegion?: string
  }
  homeAddress?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    countryOrRegion?: string
  }
  emailAddresses?: { address: string; name?: string }[]
  mobilePhone?: string
  businessPhones?: string[]
  homePhones?: string[]
}

export interface ContactCoordinate {
  Id: string
  Latitude: number
  Longitude: number
}

// ─── Route Planning ───────────────────────────────────────────────────────────
export interface Geocoordinates {
  Latitude: number | null
  Longitude: number | null
}

export interface OJob {
  Id: string
  Duration: number
  Street: string
  City: string
  Postalcode: string
  Country: string
  Geocoordinates: Geocoordinates | null
}

export interface WorkingTime {
  Day: number
  WorkingStartDate: Date
  WorkingEndDate: Date
}

export interface OptimizationWorker {
  WorkingTimes: WorkingTime[]
  Street: string
  City: string
  Postalcode: string
  Country: string
  Geocoordinates: Geocoordinates | null
}

export interface OptimizationParams {
  PlanningPeriodStartDate: Date
  PlanningPeriodEndDate: Date
  Rounding: number
  Roundtrip: boolean
}

export interface RoutePlanningInput {
  Jobs: OJob[]
  JobDispositions: unknown[]
  Workers: OptimizationWorker[]
  OptimizationParams: OptimizationParams
}

// Matches the original IJobDisposition.tsx exactly
export enum JobType {
  RegularJob = 0,
  FixedAppointment = 1,
  StartPoint = 3,
  EndPoint = 4,
  HomeStartPoint = 5,
  HomeEndPoint = 6,
  JobStartPoint = 7,
  JobEndPoint = 8,
  OvernightStayStartPoint = 9,
  OvernightStayEndPoint = 10,
}

export function isVisitStop(type: JobType): boolean {
  return type === JobType.RegularJob || type === JobType.FixedAppointment
}

export function isHomeOrTransit(type: JobType): boolean {
  return !isVisitStop(type)
}

// Matches UndispatchableReason.tsx exactly
export enum UndispatchableReason {
  Unknown = 0,
  None = 1,
  ExceededPlanningPeriod = 2,
  TravelTime = 3,
  DesiredDate = 4,
  Skill = 5,
  Worker = 6,
  WorkerBreak = 7,
  DateAndTimeAndWorker = 8,
  ConcurrentJob = 9,
  Mandatory = 10,
  JobDuration = 11,
  JobPoolNotSatisfied = 12,
  MaxNumberJobExceeded = 13,
  NotValidCoordinates = 14,
  NoValidOpeningHours = 15,
}

export const UNDISPATCHABLE_REASON_LABELS: Record<UndispatchableReason, string> = {
  [UndispatchableReason.Unknown]: 'Unknown',
  [UndispatchableReason.None]: 'No reason',
  [UndispatchableReason.ExceededPlanningPeriod]: 'Exceeded planning period',
  [UndispatchableReason.TravelTime]: 'Travel time too long',
  [UndispatchableReason.DesiredDate]: 'Desired date conflict',
  [UndispatchableReason.Skill]: 'Missing skill',
  [UndispatchableReason.Worker]: 'No worker available',
  [UndispatchableReason.WorkerBreak]: 'Worker on break',
  [UndispatchableReason.DateAndTimeAndWorker]: 'Date/time/worker conflict',
  [UndispatchableReason.ConcurrentJob]: 'Concurrent job conflict',
  [UndispatchableReason.Mandatory]: 'Mandatory constraint',
  [UndispatchableReason.JobDuration]: 'Job duration too long',
  [UndispatchableReason.JobPoolNotSatisfied]: 'Job pool not satisfied',
  [UndispatchableReason.MaxNumberJobExceeded]: 'Max jobs exceeded',
  [UndispatchableReason.NotValidCoordinates]: 'Invalid coordinates',
  [UndispatchableReason.NoValidOpeningHours]: 'No valid opening hours',
}

export interface IJob {
  Id: string
  IsWorkerHomeStartPoint: boolean
  IsJobStartPoint: boolean
  IsFixedAppointment: boolean
  IsHomeEndPoint: boolean
  IsJobEndPoint: boolean
  Duration: string
  Coordinates: Geocoordinates
  Type: JobType
  ReferenceId: string
}

export interface IJobDisposition {
  Job: IJob
  Worker: { Id: string; Name: string }
  StartDate: string
  EndDate: string
}

export interface IUndispatchableJob {
  Job: IJob
  Reason: UndispatchableReason
}

export enum OptimizeResultState {
  Successful = 0,
  Canceled = 1,
  Error = 3,
}

export interface OptimizeResult {
  JobDispositions: IJobDisposition[]
  NotDispatchableJobs: IUndispatchableJob[]
  State: OptimizeResultState
}

// ─── Visit Reports ────────────────────────────────────────────────────────────
export interface Visit {
  userId: string
  appointmentId: string
  subject: string
  partner?: string
  outcome?: string
  visitType?: string
  appointmentDate: string
  visitTime?: string
  note?: string
}

// ─── Calendar (MS Graph) ──────────────────────────────────────────────────────
export interface ICalendarEvent {
  id: string
  subject?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: {
    displayName?: string
    address?: {
      street?: string
      city?: string
      state?: string
      countryOrRegion?: string
      postalCode?: string
    }
  }
  organizer?: {
    emailAddress?: { name?: string; address?: string }
  }
}

export interface ICalendarItem {
  appointmentId: string
  isoDate: string       // "2026-04-28"
  timeStart: string     // "09:00"
  timeEnd: string       // "10:00"
  subject: string
  location: string
  street?: string
  city?: string
  countryOrRegion?: string
  postalCode?: string
}

export interface ICalendarDay {
  label: string         // "Monday, 28.04.2026"
  isoDate: string       // "2026-04-28"
  dayOfWeek: number     // 1=Mon … 7=Sun
  items: ICalendarItem[]
}

export interface ICalendarWeek {
  weekKey: string       // "17/2026"
  label: string         // "Week 17, 2026"
  days: ICalendarDay[]
  totalEvents: number
}
