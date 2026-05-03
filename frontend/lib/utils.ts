import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ICalendarEvent, ICalendarItem, ICalendarDay, ICalendarWeek, Visit } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale = 'en') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(date))
}

export function formatTime(date: string | Date, locale = 'en') {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return `${formatDate(date)} ${formatTime(date)}`
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function csvCell(value: string | undefined | null): string {
  const s = value ?? ''
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export function exportVisitsCsv(visits: Visit[]): void {
  const headers = ['Date', 'Subject', 'Partner', 'Visit Type', 'Outcome', 'Time', 'Notes']
  const rows = visits.map((v) => [
    csvCell(v.appointmentDate),
    csvCell(v.subject),
    csvCell(v.partner),
    csvCell(v.visitType),
    csvCell(v.outcome),
    csvCell(v.visitTime),
    csvCell(v.note),
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `visits-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Calendar processing ──────────────────────────────────────────────────────

function getISOWeek(d: Date): { week: number; year: number } {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const jan4 = new Date(date.getFullYear(), 0, 4)
  const week = 1 + Math.round(
    ((date.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7
  )
  return { week, year: date.getFullYear() }
}

// Parse "2026-04-28T09:00:00.0000000" → "09:00"
function parseTimeHM(dateTimeStr: string): string {
  return dateTimeStr.slice(11, 16)
}

// Parse "2026-04-28T09:00:00.0000000" → "2026-04-28"
function parseDateISO(dateTimeStr: string): string {
  return dateTimeStr.slice(0, 10)
}

// Weekday label (1=Mon … 7=Sun) and display label from ISO date "2026-04-28"
function parseDayMeta(isoDate: string): { label: string; dayOfWeek: number } {
  const d = new Date(isoDate + 'T00:00:00')
  const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay() // 1=Mon…7=Sun
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
  const formatted = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return { label: `${dayName}, ${formatted}`, dayOfWeek }
}

const SKIP_LOCATIONS = new Set(['Start', 'End'])

export function processCalendarEvents(
  events: ICalendarEvent[],
  rangeStart?: Date,
  rangeEnd?: Date,
): ICalendarWeek[] {
  const now = new Date()
  const start = rangeStart ?? (() => { const d = new Date(now); d.setDate(d.getDate() - 70); return d })()
  const end   = rangeEnd   ?? (() => { const d = new Date(now); d.setDate(d.getDate() + 28); return d })()

  const weekMap = new Map<string, ICalendarWeek>()

  for (const ev of events) {
    const loc = ev.location?.displayName ?? ''
    if (SKIP_LOCATIONS.has(loc)) continue

    const isoDate = parseDateISO(ev.start.dateTime)
    const evDate = new Date(isoDate + 'T00:00:00')
    if (evDate < start || evDate > end) continue

    const { week, year } = getISOWeek(evDate)
    const weekKey = `${week}/${year}`

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekKey,
        label: `Week ${week}, ${year}`,
        days: [],
        totalEvents: 0,
      })
    }

    const weekData = weekMap.get(weekKey)!
    let dayData = weekData.days.find((d) => d.isoDate === isoDate)
    if (!dayData) {
      const { label, dayOfWeek } = parseDayMeta(isoDate)
      dayData = { label, isoDate, dayOfWeek, items: [] }
      weekData.days.push(dayData)
    }

    const item: ICalendarItem = {
      appointmentId: ev.id,
      isoDate,
      timeStart: parseTimeHM(ev.start.dateTime),
      timeEnd: parseTimeHM(ev.end.dateTime),
      subject: ev.subject ?? '(No subject)',
      location: loc,
      street: ev.location?.address?.street,
      city: ev.location?.address?.city,
      countryOrRegion: ev.location?.address?.countryOrRegion,
      postalCode: ev.location?.address?.postalCode,
    }
    dayData.items.push(item)
    weekData.totalEvents++
  }

  // Sort within each week's days by day-of-week, and items by time
  for (const week of weekMap.values()) {
    week.days.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    for (const day of week.days) {
      day.items.sort((a, b) => a.timeStart.localeCompare(b.timeStart))
    }
  }

  // Sort weeks descending (most recent first)
  return [...weekMap.values()].sort((a, b) => {
    const [wa, ya] = a.weekKey.split('/').map(Number)
    const [wb, yb] = b.weekKey.split('/').map(Number)
    return (yb * 100 + wb) - (ya * 100 + wa)
  })
}
