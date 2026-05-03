'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { useMutation } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, MapPin, Phone, Mail, SlidersHorizontal, X, UserPlus, RefreshCw, Pencil, Trash2, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { notesApi } from '@/lib/api'
import { CreateContactDialog } from './CreateContactDialog'
import { EditContactDialog } from './EditContactDialog'
import type { GraphContact, Visit } from '@/types'

interface Props {
  contacts: GraphContact[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectIds: (ids: string[]) => void
  onDeselectIds: (ids: string[]) => void
  onContactCreated?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  visits?: Visit[]
  reminderThreshold?: number
}

function getAddress(c: GraphContact): string {
  const addr = c.businessAddress ?? c.homeAddress
  if (!addr) return ''
  return [addr.street, addr.postalCode, addr.city].filter(Boolean).join(', ')
}

export function ContactList({ contacts, selectedIds, onToggle, onSelectIds, onDeselectIds, onContactCreated, onRefresh, isRefreshing, visits = [], reminderThreshold = 60 }: Props) {
  const t  = useTranslations('contacts')
  const tc = useTranslations('common')
  const { data: session } = useSession()
  const userId = session?.user?.email ?? ''

  const [createOpen,    setCreateOpen]   = useState(false)
  const [editContact,   setEditContact]  = useState<GraphContact | null>(null)
  const [deleteTarget,  setDeleteTarget] = useState<GraphContact | null>(null)
  const [search,        setSearch]       = useState('')
  const [noteIds,       setNoteIds]      = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    notesApi.getAll(userId)
      .then((notes) => setNoteIds(new Set(notes.map((n) => n.contactId))))
      .catch(() => {})
  }, [userId])

  const today = Date.now()
  const lastVisitMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of visits) {
      if (!v.partner || !v.appointmentDate) continue
      const key = v.partner.trim().toLowerCase()
      const days = Math.floor((today - new Date(v.appointmentDate).getTime()) / 86_400_000)
      const prev = map.get(key)
      if (prev === undefined || days < prev) map.set(key, days)
    }
    return map
  }, [visits, today])

  const getDaysSince = useCallback((contact: GraphContact): number | null => {
    const key = (contact.displayName ?? '').trim().toLowerCase()
    return lastVisitMap.has(key) ? lastVisitMap.get(key)! : null
  }, [lastVisitMap])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/graph/contacts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? res.statusText)
      }
    },
    onSuccess: () => {
      toast.success(t('deleteSuccess'))
      setDeleteTarget(null)
      onRefresh?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const [showFilters,  setShowFilters]  = useState(false)
  const [cityFilter,   setCityFilter]   = useState('')
  const [companyFilter,setCompanyFilter]= useState('')
  const [hasAddressOnly,setHasAddressOnly]=useState(false)
  const [selectedOnly, setSelectedOnly] = useState(false)

  const activeFilterCount = [
    cityFilter.trim() !== '',
    companyFilter.trim() !== '',
    hasAddressOnly,
    selectedOnly,
  ].filter(Boolean).length

  const clearFilters = () => {
    setCityFilter('')
    setCompanyFilter('')
    setHasAddressOnly(false)
    setSelectedOnly(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const city = cityFilter.trim().toLowerCase()
    const company = companyFilter.trim().toLowerCase()

    return contacts.filter((c) => {
      // text search
      if (q && !(
        (c.displayName ?? '').toLowerCase().includes(q) ||
        getAddress(c).toLowerCase().includes(q)
      )) return false

      // city filter
      if (city) {
        const addr = c.businessAddress ?? c.homeAddress
        if (!addr?.city?.toLowerCase().includes(city)) return false
      }

      // company filter
      if (company && !(c.companyName ?? '').toLowerCase().includes(company)) return false

      // has address filter
      if (hasAddressOnly) {
        const addr = c.businessAddress ?? c.homeAddress
        if (!addr?.street && !addr?.city) return false
      }

      // selected only
      if (selectedOnly && !selectedIds.has(c.id)) return false

      return true
    })
  }, [contacts, search, cityFilter, companyFilter, hasAddressOnly, selectedOnly, selectedIds])

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))

  const handleToggleAll = () => {
    const ids = filtered.map((c) => c.id)
    if (allFilteredSelected) onDeselectIds(ids)
    else onSelectIds(ids)
  }

  return (
    <>
    <div className="flex flex-col h-full rounded-lg border overflow-hidden bg-card">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('header')}
          </span>
          <div className="flex items-center gap-1.5">
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="text-xs h-5">
                {t('selected', { count: selectedIds.size })}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{t('total', { count: contacts.length })}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              title={t('refresh')}
              onClick={() => onRefresh?.()}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} suppressHydrationWarning />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              title={t('newContact')}
              onClick={() => setCreateOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5" suppressHydrationWarning />
            </Button>
          </div>
        </div>

        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" suppressHydrationWarning />
            <Input
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" suppressHydrationWarning />
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="space-y-2 pt-1 pb-0.5">
            <Input
              placeholder={t('filters.cityPlaceholder')}
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder={t('filters.companyPlaceholder')}
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-7 text-xs"
            />
            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={hasAddressOnly}
                  onChange={(e) => setHasAddressOnly(e.target.checked)}
                />
                {t('filters.hasAddress')}
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selectedOnly}
                  onChange={(e) => setSelectedOnly(e.target.checked)}
                />
                {t('filters.selectedOnly')}
              </label>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" suppressHydrationWarning />
                {t('filters.clear')}
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleToggleAll}
          >
            {allFilteredSelected ? t('deselectAll') : t('selectAll')}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => onDeselectIds(contacts.map((c) => c.id))}
            >
              {t('clear')}
            </Button>
          )}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs h-7 px-2">
              {activeFilterCount === 1
                ? t('filters.activeCount', { count: activeFilterCount })
                : t('filters.activeCountPlural', { count: activeFilterCount })}
            </Badge>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('noResults')}</p>
          )}
          {filtered.map((contact) => {
            const selected = selectedIds.has(contact.id)
            const address = getAddress(contact)
            return (
              <div
                key={contact.id}
                className={cn(
                  'group flex items-start transition-colors hover:bg-accent/40',
                  selected && 'bg-primary/5'
                )}
              >
                <button
                  onClick={() => onToggle(contact.id)}
                  className="flex-1 flex items-start gap-3 px-3 py-2.5 text-left min-w-0"
                >
                  <span
                    className={cn(
                      'mt-1 h-3 w-3 rounded-full border-2 shrink-0 transition-colors',
                      selected ? 'bg-primary border-primary' : 'border-muted-foreground/30 bg-transparent'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={cn('text-sm font-medium truncate leading-tight', selected ? 'text-primary' : 'text-foreground')}>
                        {contact.displayName ?? '(No name)'}
                      </p>
                      {noteIds.has(contact.id) && (
                        <StickyNote className="h-3 w-3 shrink-0 text-amber-400" suppressHydrationWarning />
                      )}
                      {(() => {
                        const days = getDaysSince(contact)
                        if (days === null) return null
                        const overdue = days > reminderThreshold
                        return (
                          <span className={cn(
                            'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none',
                            overdue
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-green-500/10 text-green-600 dark:text-green-400'
                          )}>
                            {days === 0 ? t('todayBadge') : t('daysBadge', { days })}
                          </span>
                        )
                      })()}
                    </div>
                    {contact.jobTitle || contact.companyName ? (
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                        {[contact.jobTitle, contact.companyName].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                    {address ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-2.5 w-2.5 shrink-0" suppressHydrationWarning />
                        {address}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 mt-0.5">{t('noAddress')}</p>
                    )}
                    {(contact.mobilePhone ?? contact.businessPhones?.[0]) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Phone className="h-2.5 w-2.5 shrink-0" suppressHydrationWarning />
                        {contact.mobilePhone ?? contact.businessPhones![0]}
                      </p>
                    )}
                    {contact.emailAddresses?.[0]?.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="h-2.5 w-2.5 shrink-0" suppressHydrationWarning />
                        {contact.emailAddresses[0].address}
                      </p>
                    )}
                  </div>
                </button>
                {/* Action buttons */}
                <div className="flex items-center gap-0.5 pr-2 pt-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditContact(contact)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title={tc('edit')}
                  >
                    <Pencil className="h-3.5 w-3.5" suppressHydrationWarning />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(contact)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title={tc('delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" suppressHydrationWarning />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>

    <CreateContactDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      onCreated={() => { onContactCreated?.() }}
    />

    <EditContactDialog
      key={editContact?.id ?? 'none'}
      contact={editContact}
      open={!!editContact}
      onOpenChange={(v) => { if (!v) setEditContact(null) }}
      onUpdated={() => { onRefresh?.() }}
      onNoteSaved={(contactId, hasNote) => {
        setNoteIds((prev) => {
          const next = new Set(prev)
          if (hasNote) next.add(contactId)
          else next.delete(contactId)
          return next
        })
      }}
    />

    <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteConfirmDescription', { name: deleteTarget?.displayName ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>{tc('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {tc('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
