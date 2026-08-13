const TOKEN_KEY = 'tianxing.admin.token'
const EXPIRES_AT_KEY = 'tianxing.admin.expiresAt'
const LEGACY_TOKEN_KEY = 'tianxing_admin_token'
const LEGACY_USER_KEY = 'tianxing_admin_username'

export function saveAdminSession(token: string, expiresInSeconds: number, username?: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000))
  localStorage.setItem(LEGACY_TOKEN_KEY, token)
  if (username) {
    localStorage.setItem(LEGACY_USER_KEY, username)
  }
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.removeItem(LEGACY_USER_KEY)
}

export function hasValidAdminSession(): boolean {
  const token = getAdminToken()
  const expiresAtStr = localStorage.getItem(EXPIRES_AT_KEY)
  if (!token) {
    clearAdminSession()
    return false
  }
  if (expiresAtStr) {
    const expiresAt = Number(expiresAtStr)
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      clearAdminSession()
      return false
    }
  }
  return true
}
