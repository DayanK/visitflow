let loaded = false

export async function loadAtlasSDK(): Promise<void> {
  if (loaded || (window as any).atlas) { loaded = true; return }
  return new Promise((resolve) => {
    if (!document.getElementById('atlas-css')) {
      const link = document.createElement('link')
      link.id = 'atlas-css'
      link.rel = 'stylesheet'
      link.href = 'https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css'
      document.head.appendChild(link)
    }
    const existing = document.getElementById('atlas-js')
    if (existing) {
      if ((window as any).atlas) { loaded = true; resolve(); return }
      existing.addEventListener('load', () => { loaded = true; resolve() }, { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'atlas-js'
    script.src = 'https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js'
    script.onload = () => { loaded = true; resolve() }
    document.head.appendChild(script)
  })
}
