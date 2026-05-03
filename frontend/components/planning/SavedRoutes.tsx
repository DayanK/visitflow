'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { History, Trash2, MapPin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { routeHistoryApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Props {
  onLoad: (contactIds: string[]) => void
}

export function SavedRoutes({ onLoad }: Props) {
  const { data: session } = useSession()
  const userId = session?.user?.email ?? ''
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: routes = [], isPending } = useQuery({
    queryKey: ['route-history', userId],
    queryFn: () => routeHistoryApi.getAll(userId),
    enabled: !!userId && open,
  })

  const deleteMutation = useMutation({
    mutationFn: (routeId: string) => routeHistoryApi.delete(userId, routeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-history', userId] })
      toast.success('Route deleted')
    },
    onError: () => toast.error('Failed to delete route'),
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="lg">
          <History className="mr-2 h-4 w-4" suppressHydrationWarning />
          History
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-3 py-2.5 border-b">
          <p className="text-sm font-medium">Saved Routes</p>
          <p className="text-xs text-muted-foreground mt-0.5">Load a past route to re-select its contacts</p>
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" suppressHydrationWarning />
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <MapPin className="h-6 w-6 opacity-30" suppressHydrationWarning />
            <p className="text-xs">No saved routes yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="py-1">
              {routes.map((route, i) => (
                <div key={route.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-accent/40 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{route.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(route.createdAt)} · {route.contactIds.length} contacts
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          onLoad(route.contactIds)
                          setOpen(false)
                          toast.success(`${route.contactIds.length} contacts selected`)
                        }}
                      >
                        Load
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(route.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" suppressHydrationWarning />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
