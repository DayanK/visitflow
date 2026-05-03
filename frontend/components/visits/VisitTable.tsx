'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { visitsApi } from '@/lib/api'
import { VisitForm } from './VisitForm'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Plus, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatTime } from '@/lib/utils'
import type { Visit } from '@/types'

const VISIT_TYPE_LABEL: Record<string, string> = {
  onsite: 'On-site',
  remote: 'Remote',
  phone: 'Phone',
  other: 'Other',
}

interface Props {
  visits: Visit[]
  userId: string
}

export function VisitTable({ visits, userId }: Props) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Visit | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: Partial<Visit>) => visitsApi.create({ ...data, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', userId] })
      toast.success('Visit report created')
      setFormOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Visit>) =>
      visitsApi.update({ ...data, userId, appointmentId: editing?.appointmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', userId] })
      toast.success('Visit report updated')
      setEditing(null)
      setFormOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (visit: Visit) => visitsApi.delete(visit.appointmentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', userId] })
      toast.success('Visit report deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSave = (values: Omit<Visit, 'userId' | 'appointmentId'>) => {
    if (editing) {
      updateMutation.mutate(values)
    } else {
      createMutation.mutate(values)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ClipboardList className="h-10 w-10 opacity-30" />
        <p className="text-sm">No visit reports yet.</p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create first report
        </Button>

        <VisitForm
          open={formOpen}
          onOpenChange={setFormOpen}
          visit={null}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New report
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => (
              <TableRow key={visit.appointmentId}>
                <TableCell className="font-medium max-w-[200px] truncate">{visit.subject}</TableCell>
                <TableCell>{formatDate(visit.appointmentDate)}</TableCell>
                <TableCell>{visit.visitTime ? formatTime(`1970-01-01T${visit.visitTime}`) : '—'}</TableCell>
                <TableCell>
                  {visit.visitType ? (
                    <Badge variant="outline" className="text-xs">
                      {VISIT_TYPE_LABEL[visit.visitType] ?? visit.visitType}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{visit.partner || '—'}</TableCell>
                <TableCell className="max-w-[160px] truncate text-muted-foreground">
                  {visit.outcome || '—'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(visit)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteMutation.mutate(visit)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <VisitForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        visit={editing}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  )
}
