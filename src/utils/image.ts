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
const legacyAssetPrefix = trimTrailingSlash(import.meta.env.VITE_LEGACY_ASSET_PREFIX || '')

export function resolveImageUrl(source: unknown): string {
  if (typeof source !== 'string' || source.trim() === '') {
    return ''
  }

  const value = source.trim()

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  if (value.startsWith('/admin-files/')) {
    return `${apiAssetFallback || window.location.origin}/${value.replace(/^\/+/, '')}`
  }

  if (value.startsWith('/imgs/') && legacyAssetPrefix) {
    return `${legacyAssetPrefix}/${value.replace(/^\/+/, '')}`
  }

  return `${assetPrefix}/${value.replace(/^\/+/, '')}`
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
