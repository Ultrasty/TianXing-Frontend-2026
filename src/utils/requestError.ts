import axios from 'axios'

export function requestErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const status = error.response?.status
  if (status) {
    return `${fallback}（服务器返回 ${status}）`
  }

  if (error.code === 'ERR_NETWORK') {
    return `${fallback}（无法连接服务器）`
  }

  return fallback
}
