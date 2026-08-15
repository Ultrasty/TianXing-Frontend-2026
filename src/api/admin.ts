import axios, { AxiosError, AxiosHeaders } from 'axios'
import { clearAdminSession, getAdminToken } from '@/utils/adminAuth'

export type EvaluationCategory = 'ENSO' | 'NAO' | 'SIC' | 'SIE'
export type ImportMode = 'REJECT' | 'UPSERT'

export interface AdminApiResponse<T> {
  code: number | string
  message: string
  data: T
  details?: Record<string, unknown>
}

export interface LoginResponse {
  token: string
  tokenType: 'Bearer'
  expiresIn: number
}

export interface EvaluationRecord {
  category: EvaluationCategory
  id: number
  year: string
  month?: string
  day?: string
  varModel?: string
  data: unknown[]
}

export interface EvaluationPayload {
  category?: EvaluationCategory
  year: string
  month?: string
  day?: string
  varModel?: string
  data: unknown[]
  source?: string
}

export interface EvaluationPage {
  page: number
  pageSize: number
  total: number
  items: EvaluationRecord[]
}

export interface CategoryMetadata {
  table: string
  requiredFields: string[]
  allowedVarModels: string[]
  dataType: string
  naturalKey: string
}

export interface EvaluationMetadata {
  categories: Record<EvaluationCategory, CategoryMetadata>
  import: {
    formats: string[]
    modes: ImportMode[]
    maxRecords: number
    maxFileSizeBytes: number
  }
}

export interface ImportResult {
  category: EvaluationCategory
  source: 'MANUAL' | 'ECMWF'
  mode: ImportMode
  total: number
  inserted: number
  updated: number
}

export interface EcmwfPreviewRequest {
  date?: string
  time?: number
  step?: number
  param: string
  levtype?: string
  levelist?: number
  stream?: string
  forecastType?: string
  provider?: string
  model?: string
  reducer?: 'MEAN' | 'ROW_MEAN' | 'SAMPLE'
  maxPoints?: number
}

export interface EcmwfPreview {
  source: 'ECMWF'
  dataKind: 'RAW_FIELD_REDUCTION'
  publishable: false
  values: unknown[]
  metadata: Record<string, unknown>
  notice: string
}

export interface NsidcEvaluationRequest {
  category: 'SIC' | 'SIE'
  year: string
  month?: string
  day?: string
  leadStartOffsetDays?: 0 | 1
  mode: 'PREVIEW' | 'UPSERT'
}

export interface NsidcEvaluationResult {
  source: 'NSIDC'
  dataKind: 'EVALUATION_METRIC'
  category: 'SIC' | 'SIE'
  predictionModel: 'SIC_Ice-BCNet' | 'prediction_IceTFT'
  observation: {
    datasetId: string
    name?: string
    version: string
    doi?: string
    accessedAt?: string
    urls?: Record<string, string>
    sha256?: Record<string, string>
  }
  matching: Record<string, unknown>
  metricDefinitions: Record<string, string>
  diagnostics: Array<Record<string, unknown>>
  records: EvaluationPayload[]
  published: boolean
  publication?: {
    mode: 'UPSERT'
    inserted: number
    updated: number
    recordIds: number[]
  }
}

const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:8888' : '/api'

export const adminHttp = axios.create({
  baseURL: import.meta.env.VITE_API_PREFIX || import.meta.env.VITE_API_BASE_URL || axios.defaults.baseURL || defaultBaseUrl,
  timeout: 300_000,
})

adminHttp.interceptors.request.use((config) => {
  const token = getAdminToken()
  if (token) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

adminHttp.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.endsWith('/admin/auth/login')) {
      clearAdminSession()
      const redirect = encodeURIComponent(window.location.hash.replace(/^#/, '') || '/admin/evaluations')
      window.location.hash = `/admin/login?redirect=${redirect}`
    }
    return Promise.reject(error)
  },
)

export function getAdminApiError(error: unknown, fallback = '请求失败'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<AdminApiResponse<unknown>> | undefined
    if (data?.message) return data.message
    if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试'
    if (!error.response) return '无法连接后端服务'
  }
  return error instanceof Error && error.message ? error.message : fallback
}

export async function loginAdmin(username: string, password: string) {
  const response = await adminHttp.post<AdminApiResponse<LoginResponse>>('/admin/auth/login', { username, password })
  return response.data.data
}

export async function getEvaluationMetadata() {
  const response = await adminHttp.get<AdminApiResponse<EvaluationMetadata>>('/admin/evaluations/meta')
  return response.data.data
}

export async function getEvaluations(params: Record<string, string | number | undefined>) {
  const response = await adminHttp.get<AdminApiResponse<EvaluationPage>>('/admin/evaluations', { params })
  return response.data.data
}

export async function createEvaluation(payload: EvaluationPayload & { category: EvaluationCategory }) {
  const response = await adminHttp.post<AdminApiResponse<EvaluationRecord>>('/admin/evaluations', payload)
  return response.data.data
}

export async function updateEvaluation(category: EvaluationCategory, id: number, payload: EvaluationPayload) {
  const response = await adminHttp.put<AdminApiResponse<EvaluationRecord>>(
    `/admin/evaluations/${category}/${id}`,
    payload,
  )
  return response.data.data
}

export async function deleteEvaluation(category: EvaluationCategory, id: number) {
  const response = await adminHttp.delete<AdminApiResponse<EvaluationRecord>>(
    `/admin/evaluations/${category}/${id}`,
  )
  return response.data.data
}

export async function importEvaluationFile(category: EvaluationCategory, mode: ImportMode, file: File) {
  const form = new FormData()
  form.append('file', file)
  const response = await adminHttp.post<AdminApiResponse<ImportResult>>(
    '/admin/evaluations/import/manual',
    form,
    { params: { category, mode } },
  )
  return response.data.data
}

export async function fetchEcmwfPreview(payload: EcmwfPreviewRequest) {
  const response = await adminHttp.post<AdminApiResponse<EcmwfPreview>>(
    '/admin/evaluations/ecmwf/preview',
    payload,
  )
  return response.data.data
}

export async function evaluateWithNsidc(payload: NsidcEvaluationRequest) {
  const response = await adminHttp.post<AdminApiResponse<NsidcEvaluationResult>>(
    '/admin/evaluations/nsidc/evaluate',
    payload,
    { timeout: 900_000 },
  )
  return response.data.data
}
