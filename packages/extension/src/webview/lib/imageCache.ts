interface CacheEntry {
  img: HTMLImageElement
  loaded: boolean
  error: boolean
}

const cache = new Map<string, CacheEntry>()

export function getImage(
  url: string,
  onLoad?: () => void
): HTMLImageElement | null {
  const entry = cache.get(url)

  if (entry) {
    return entry.loaded ? entry.img : null
  }

  const img = new Image()
  const newEntry: CacheEntry = { img, loaded: false, error: false }
  cache.set(url, newEntry)

  img.onload = () => {
    newEntry.loaded = true
    onLoad?.()
  }

  img.onerror = () => {
    newEntry.error = true
  }

  img.src = url

  return null
}

export function clearImageCache(): void {
  cache.clear()
}
