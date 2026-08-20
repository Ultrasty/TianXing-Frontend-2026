import axios, { AxiosHeaders } from 'axios'

const adminRequest = axios.create()

adminRequest.interceptors.request.use((config) => {
    config.baseURL = import.meta.env.VITE_API_PREFIX
        || import.meta.env.VITE_API_BASE_URL
        || axios.defaults.baseURL
        || 'https://tianxing.tongji.edu.cn/api/'
    const token = localStorage.getItem('tianxing_admin_token')
    if (token) {
        const headers = AxiosHeaders.from(config.headers)
        headers.set('Authorization', `Bearer ${token}`)
        config.headers = headers
    }
    return config
})

adminRequest.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            localStorage.removeItem('tianxing_admin_token')
            localStorage.removeItem('tianxing_admin_username')
        }
        return Promise.reject(error)
    },
)

export default adminRequest
