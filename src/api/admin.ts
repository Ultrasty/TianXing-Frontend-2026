import axios from 'axios'

export const ADMIN_TOKEN_KEY = 'tianxing_admin_token'

const adminApi = axios.create({
  baseURL: '',
  timeout: 300_000,
})

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      if (!window.location.hash.includes('/admin/login')) {
        window.location.hash = '#/admin/login'
      }
    }
    return Promise.reject(error)
  },
)

export interface ForecastDataRecord {
  id: number
  year: string
  month: string
  var_model: string
  data?: string | unknown
  data_preview?: string
  data_length?: number
}

export interface ForecastDataPayload {
  dataset: string
  year: string
  month: string
  varModel: string
  data: string
}

export function adminLogin(username: string, password: string) {
  return adminApi.post('/admin/auth/login', { username, password })
}

export function adminLogout() {
  return adminApi.post('/admin/auth/logout')
}

export function getForecastMeta() {
  return adminApi.get('/admin/forecast-data/meta')
}

export function getForecastData(params: Record<string, unknown>) {
  return adminApi.get('/admin/forecast-data', { params })
}

export function getForecastDataById(dataset: string, id: number) {
  return adminApi.get(`/admin/forecast-data/${id}`, { params: { dataset } })
}

export function createForecastData(payload: ForecastDataPayload) {
  return adminApi.post('/admin/forecast-data', payload)
}

export function updateForecastData(id: number, payload: ForecastDataPayload) {
  return adminApi.put(`/admin/forecast-data/${id}`, payload)
}

export function deleteForecastData(dataset: string, id: number) {
  return adminApi.delete(`/admin/forecast-data/${id}`, { params: { dataset } })
}

export function uploadForecastData(formData: FormData) {
  return adminApi.post('/admin/forecast-data/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function importForecastFromEcmwf(payload: Record<string, unknown>) {
  return adminApi.post('/admin/forecast-data/ecmwf', payload)
}

export function importIndexFromNoaa(payload: Record<string, unknown>) {
  return adminApi.post('/admin/forecast-data/noaa-index', payload)
}

export default adminApi
