const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const apiPrefix = trimTrailingSlash(
  import.meta.env.VITE_API_PREFIX || import.meta.env.VITE_API_BASE_URL || '',
)
const apiAssetFallback = apiPrefix.endsWith('/api')
  ? apiPrefix.slice(0, -4)
  : apiPrefix

const assetPrefix = trimTrailingSlash(
  import.meta.env.VITE_ASSET_PREFIX
  || apiAssetFallback
  || window.location.origin,
)
const legacyAssetPrefix = trimTrailingSlash(
  import.meta.env.VITE_LEGACY_ASSET_PREFIX || 'https://tianxing.tongji.edu.cn',
)
const legacyFallbackPrefixes = ['/admin-files/', '/imgs/']

export function resolveImageUrl(source: unknown): string {
  if (typeof source !== 'string' || source.trim() === '') {
    return ''
  }

  const value = source.trim()
  const path = `/${value.replace(/^\/+/, '')}`

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  if (path.startsWith('/admin-files/')) {
    return `${apiAssetFallback || window.location.origin}${path}`
  }

  if (path.startsWith('/imgs/') && legacyAssetPrefix) {
    return `${legacyAssetPrefix}${path}`
  }

  return `${assetPrefix}${path}`
}

export function resolveOnlineImageUrl(source: unknown): string {
  if (typeof source !== 'string' || source.trim() === '' || !legacyAssetPrefix) {
    return ''
  }

  const value = source.trim()
  try {
    const url = new URL(value, window.location.origin)
    if (trimTrailingSlash(url.origin) === legacyAssetPrefix) {
      return ''
    }
    if (legacyFallbackPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
      return `${legacyAssetPrefix}${url.pathname}${url.search}${url.hash}`
    }
    return ''
  } catch (_error) {
    const path = `/${value.replace(/^\/+/, '')}`
    if (legacyFallbackPrefixes.some((prefix) => path.startsWith(prefix))) {
      return `${legacyAssetPrefix}${path}`
    }
    return ''
  }
}

export function useOnlineImageFallback(event: Event): void {
  const image = event.target instanceof HTMLImageElement ? event.target : null
  const fallback = resolveOnlineImageUrl(image?.currentSrc || image?.src)
  if (!image || !fallback || image.src === fallback) {
    return
  }
  image.src = fallback
}

export function preloadImages(sources: unknown[]): void {
  const uniqueSources = new Set(
    sources
      .map(resolveImageUrl)
      .filter(Boolean),
  )

  uniqueSources.forEach((source) => {
    const image = new Image()
    image.src = source
  })
}
