interface CacheEntry {
  img: HTMLImageElement
  loaded: boolean
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
  const newEntry: CacheEntry = { img, loaded: false }
  cache.set(url, newEntry)

  img.onload = () => {
    newEntry.loaded = true
    onLoad?.()
  }

  img.src = url

  return null
}

export function clearImageCache(): void {
  cache.clear()
}
