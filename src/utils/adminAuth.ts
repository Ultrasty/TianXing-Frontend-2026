const TOKEN_KEY = 'tianxing.admin.token'
const EXPIRES_AT_KEY = 'tianxing.admin.expiresAt'

export function saveAdminSession(token: string, expiresInSeconds: number) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000))
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
}

export function hasValidAdminSession(): boolean {
  const token = getAdminToken()
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY))
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearAdminSession()
    return false
  }
  return true
}
