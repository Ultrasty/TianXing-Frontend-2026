const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const apiPrefix = trimTrailingSlash(import.meta.env.VITE_API_PREFIX || '')
const apiAssetFallback = apiPrefix.endsWith('/api')
  ? apiPrefix.slice(0, -4)
  : apiPrefix

const assetPrefix = trimTrailingSlash(
  import.meta.env.VITE_ASSET_PREFIX
  || apiAssetFallback
  || window.location.origin,
)

export function resolveImageUrl(source: unknown): string {
  if (typeof source !== 'string' || source.trim() === '') {
    return ''
  }

  if (/^https?:\/\//i.test(source)) {
    return source
  }

  return `${assetPrefix}/${source.replace(/^\/+/, '')}`
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
