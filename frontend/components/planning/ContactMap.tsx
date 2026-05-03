'use client'

import { useEffect, useRef, useState } from 'react'
import { loadAtlasSDK } from '@/lib/atlas'
import { Button } from '@/components/ui/button'
import { Loader2, CircleDot, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GraphContact, ContactCoordinate } from '@/types'

interface Props {
  contacts: GraphContact[]
  selectedIds: Set<string>
  coordinates: ContactCoordinate[]
  isLoading: boolean
  onToggle: (id: string) => void
  onRadiusSelect: (ids: string[]) => void
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function circlePolygon(lat: number, lng: number, radiusM: number, steps = 72): number[][] {
  const coords: number[][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dlat = (radiusM / 111320) * Math.cos(angle)
    const dlng = (radiusM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle)
    coords.push([lng + dlng, lat + dlat])
  }
  return coords
}

export function ContactMap({
  contacts,
  selectedIds,
  coordinates,
  isLoading,
  onToggle,
  onRadiusSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const circleSourceRef = useRef<any>(null)
  const centerMarkerRef = useRef<any>(null)
  const isMapReadyRef = useRef(false)
  const hasFitCameraRef = useRef(false)

  const [drawMode, setDrawMode] = useState(false)
  const [drawStep, setDrawStep] = useState<'idle' | 'center-set'>('idle')
  const drawModeRef = useRef(false)
  const drawCenterRef = useRef<[number, number] | null>(null)

  // Stable refs so map callbacks always see latest values
  const onToggleRef = useRef(onToggle)
  const onRadiusSelectRef = useRef(onRadiusSelect)
  const coordinatesRef = useRef<ContactCoordinate[]>(coordinates ?? [])
  const selectedIdsRef = useRef(selectedIds)
  const contactsRef = useRef(contacts)
  useEffect(() => { onToggleRef.current = onToggle }, [onToggle])
  useEffect(() => { onRadiusSelectRef.current = onRadiusSelect }, [onRadiusSelect])
  useEffect(() => { coordinatesRef.current = coordinates ?? [] }, [coordinates])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])
  useEffect(() => { contactsRef.current = contacts }, [contacts])

  // Rebuild all HtmlMarker pins from current coordinates + selection
  const renderPins = () => {
    const atlas = (window as any).atlas
    const map = mapRef.current
    if (!atlas || !map) return

    for (const m of markersRef.current) map.markers.remove(m)
    markersRef.current = []

    const coords = coordinatesRef.current
    const ids = selectedIdsRef.current
    const ctacts = contactsRef.current

    const valid = coords.filter((c) => c.Latitude && c.Longitude)

    for (const coord of valid) {
      const contact = ctacts.find((co) => co.id === coord.Id)
      const selected = ids.has(coord.Id)

      const marker = new atlas.HtmlMarker({
        position: [coord.Longitude, coord.Latitude],
        color: selected ? '#3b82f6' : '#9ca3af',
        text: contact?.displayName?.[0]?.toUpperCase() ?? '',
      })

      map.events.add('click', marker, () => {
        if (drawModeRef.current) return
        onToggleRef.current(coord.Id)
      })
      map.events.add('mouseover', marker, () => {
        if (!drawModeRef.current) {
          const c = map.getCanvasContainer?.()
          if (c) c.style.cursor = 'pointer'
        }
      })
      map.events.add('mouseout', marker, () => {
        if (!drawModeRef.current) {
          const c = map.getCanvasContainer?.()
          if (c) c.style.cursor = ''
        }
      })

      map.markers.add(marker)
      markersRef.current.push(marker)
    }

    // Fly to bounds on first load with coordinates
    if (!hasFitCameraRef.current && valid.length > 0) {
      const bounds = atlas.data.BoundingBox.fromPositions(
        valid.map((c) => [c.Longitude, c.Latitude])
      )
      const w = containerRef.current?.clientWidth ?? 400
      const h = containerRef.current?.clientHeight ?? 400
      const padding = Math.min(70, Math.floor(Math.min(w, h) / 4))
      map.setCamera({ bounds, padding, type: 'fly', duration: 800 })
      hasFitCameraRef.current = true
    }
  }
  const renderPinsRef = useRef(renderPins)
  renderPinsRef.current = renderPins

  useEffect(() => {
    if (!isMapReadyRef.current) return
    renderPinsRef.current()
  }, [coordinates, selectedIds])

  // Disable map interaction while drawing; cancel restores state
  useEffect(() => {
    drawModeRef.current = drawMode
    const map = mapRef.current
    if (!map) return
    try {
      map.setUserInteraction({
        dragPanInteraction: !drawMode,
        scrollZoomInteraction: !drawMode,
        dblClickZoomInteraction: !drawMode,
      })
      const canvas = map.getCanvasContainer?.()
      if (canvas) canvas.style.cursor = drawMode ? 'crosshair' : ''
    } catch {}
    if (!drawMode) {
      drawCenterRef.current = null
      setDrawStep('idle')
      circleSourceRef.current?.clear()
      if (centerMarkerRef.current) {
        map.markers.remove(centerMarkerRef.current)
        centerMarkerRef.current = null
      }
    }
  }, [drawMode])

  function updateCirclePreview(center: [number, number], edge: [number, number]) {
    const atlas = (window as any).atlas
    if (!circleSourceRef.current || !atlas) return
    const radius = haversineMeters(center[1], center[0], edge[1], edge[0])
    if (radius < 10) return
    const poly = circlePolygon(center[1], center[0], radius)
    circleSourceRef.current.clear()
    circleSourceRef.current.add(new atlas.data.Feature(new atlas.data.Polygon([poly])))
  }

  // Init map once
  useEffect(() => {
    const AZURE_MAPS_KEY = process.env.NEXT_PUBLIC_AZURE_MAPS_KEY
    if (!AZURE_MAPS_KEY || !containerRef.current) return

    let destroyed = false

    async function init() {
      await loadAtlasSDK()
      if (destroyed || !containerRef.current) return
      const atlas = (window as any).atlas

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

      const map = new atlas.Map(containerRef.current, {
        authOptions: {
          authType: atlas.AuthenticationType.subscriptionKey,
          subscriptionKey: AZURE_MAPS_KEY,
        },
        zoom: 6,
        center: [10.9, 48.4],
        language: 'en-US',
        style: isDark ? 'night' : 'road',
      })
      mapRef.current = map

      map.events.add('ready', () => {
        if (destroyed) return

        // ── Controls ──────────────────────────────────────────────────────────
        map.controls.add(
          [
            new atlas.control.ZoomControl(),
            new atlas.control.CompassControl(),
            new atlas.control.StyleControl({
              mapStyles: [
                'road',
                'night',
                'grayscale_light',
                'grayscale_dark',
                'satellite_road_labels',
              ],
            }),
          ],
          { position: 'top-right' }
        )
        map.controls.add(new atlas.control.ScaleControl(), { position: 'bottom-right' })

        // ── Radius-draw circle overlay ────────────────────────────────────────
        const circleDs = new atlas.source.DataSource()
        map.sources.add(circleDs)
        circleSourceRef.current = circleDs

        map.layers.add(
          new atlas.layer.PolygonLayer(circleDs, 'circle-fill', {
            fillColor: 'rgba(59,130,246,0.12)',
          })
        )
        map.layers.add(
          new atlas.layer.LineLayer(circleDs, 'circle-border', {
            strokeColor: '#3b82f6',
            strokeWidth: 2,
            strokeDashArray: [4, 3],
          })
        )

        // ── Map click: radius-draw handler ────────────────────────────────────
        map.events.add('click', (e: any) => {
          if (!drawModeRef.current || !e.position) return

          if (!drawCenterRef.current) {
            drawCenterRef.current = e.position as [number, number]
            setDrawStep('center-set')
            const dot = new atlas.HtmlMarker({
              position: e.position,
              htmlContent: `<div style="width:10px;height:10px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
            })
            map.markers.add(dot)
            centerMarkerRef.current = dot
          } else {
            const center = drawCenterRef.current
            const edge = e.position as [number, number]
            const radius = haversineMeters(center[1], center[0], edge[1], edge[0])
            if (radius > 50) {
              const inRadius = coordinatesRef.current
                .filter((c) => c.Latitude && c.Longitude)
                .filter((c) =>
                  haversineMeters(center[1], center[0], c.Latitude, c.Longitude) <= radius
                )
                .map((c) => c.Id)
              onRadiusSelectRef.current(inRadius)
            }
            drawCenterRef.current = null
            if (centerMarkerRef.current) {
              map.markers.remove(centerMarkerRef.current)
              centerMarkerRef.current = null
            }
            circleSourceRef.current?.clear()
            setDrawStep('idle')
            setDrawMode(false)
          }
        })

        map.events.add('mousemove', (e: any) => {
          if (!drawModeRef.current || !drawCenterRef.current || !e.position) return
          updateCirclePreview(drawCenterRef.current, e.position as [number, number])
        })

        isMapReadyRef.current = true
        renderPinsRef.current()
      })
    }

    init()

    return () => {
      destroyed = true
      mapRef.current?.dispose?.()
      mapRef.current = null
      markersRef.current = []
      circleSourceRef.current = null
      centerMarkerRef.current = null
      isMapReadyRef.current = false
      hasFitCameraRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hint =
    drawStep === 'idle' ? 'Click to set circle centre' : 'Move mouse to preview, then click'

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden border" />

      {/* Geocoding overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/75 rounded-lg z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Geocoding addresses…</p>
          </div>
        </div>
      )}

      {!process.env.NEXT_PUBLIC_AZURE_MAPS_KEY && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg z-10">
          <p className="text-sm text-muted-foreground">NEXT_PUBLIC_AZURE_MAPS_KEY not set</p>
        </div>
      )}

      {/* Select Radius button — left side to avoid overlap with Azure Maps controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <Button
          size="sm"
          variant={drawMode ? 'default' : 'secondary'}
          className="shadow-md"
          onClick={() => setDrawMode((v) => !v)}
        >
          {drawMode ? (
            <>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </>
          ) : (
            <>
              <CircleDot className="h-3.5 w-3.5 mr-1.5" />
              Select Radius
            </>
          )}
        </Button>
      </div>

      {/* Draw hint pill */}
      {drawMode && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-background/90 text-sm text-muted-foreground px-4 py-2 rounded-full shadow-md border">
            {hint}
          </div>
        </div>
      )}
    </div>
  )
}
