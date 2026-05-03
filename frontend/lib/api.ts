import axios from 'axios'
import { getSession } from 'next-auth/react'
import type { UserSettings } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081'

// Axios instance — token injected automatically from session
export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.error ?? error.message
    return Promise.reject(new Error(message))
  }
)

// ─── Route Planning ───────────────────────────────────────────────────────────
export const routePlanningApi = {
  getContactCoordinates: (contacts: unknown[]) =>
    api.post('/api/ContactCordinate', contacts).then((r) => r.data),

  optimize: (payload: unknown) =>
    api.post('/api/RoutePlanning', payload).then((r) => r.data),
}

// ─── User Settings ────────────────────────────────────────────────────────────
// Backend stores each setting as { username, dispSetting, settingsString } where
// settingsString is the full UserSettings object serialised as JSON.
export const settingsApi = {
  getAll: (username: string): Promise<UserSettings[]> =>
    api
      .post('/api/GetAllUserSettings', { username, dispSetting: '', settingsString: '' })
      .then((r) => {
        const rows: { username: string; dispSetting: string; settingsString: string }[] =
          r.data.userSettings ?? []
        return rows
          .map((row) => {
            try { return JSON.parse(row.settingsString) as UserSettings }
            catch { return null }
          })
          .filter((x): x is UserSettings => x !== null)
      }),

  save: (userSettings: UserSettings[]) =>
    api
      .post('/api/StoreUserSettings', {
        userSettings: userSettings.map((s) => ({
          username: s.username,
          dispSetting: 'settings', // non-empty key required by backend
          settingsString: JSON.stringify(s),
        })),
      })
      .then((r) => r.data),
}

// ─── Visit Reports ────────────────────────────────────────────────────────────
export const visitsApi = {
  getAll: (userId: string) =>
    api.get(`/api/GetAllVisitReportByUser/${userId}`).then((r) => r.data),

  create: (visit: unknown) =>
    api.post('/api/StoreUserVisitReport', visit).then((r) => r.data),

  update: (visit: unknown) =>
    api.post('/api/UpdateUserVisitReportByAppointmentId', visit).then((r) => r.data),

  delete: (appointmentId: string, userId: string) =>
    api.delete(`/api/DeleteUserVisitReportByAppointmentId/${appointmentId}`, {
      params: { userId },
    }),
}

// ─── Contact Notes ────────────────────────────────────────────────────────────
export type ContactNote = { contactId: string; content: string; updatedAt: string }

export const notesApi = {
  getAll: (userId: string): Promise<ContactNote[]> =>
    api.get(`/api/GetAllContactNotes/${encodeURIComponent(userId)}`).then((r) => r.data.notes ?? []),

  get: (userId: string, contactId: string): Promise<ContactNote> =>
    api.get(`/api/GetContactNote/${encodeURIComponent(userId)}/${encodeURIComponent(contactId)}`).then((r) => r.data.note),

  save: (userId: string, contactId: string, content: string) =>
    api.post('/api/StoreContactNote', { userId, contactId, content }).then((r) => r.data),
}

// ─── Graph API (via Next.js API routes — same origin, no CORS) ───────────────
export const graphApi = {
  getAllContacts: (_token?: string) =>
    fetch('/api/graph/contacts').then((r) => {
      if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e.error ?? r.statusText)))
      return r.json()
    }),

  getCalendarEvents: (token: string, calendarNameFromUserSetting?: unknown) =>
    api.post('/getCalendarEvents', { token, calendarNameFromUserSetting }).then((r) => r.data),

  getUserProfile: (token: string) =>
    api.post('/getUserProfile', { token }).then((r) => r.data),
}
