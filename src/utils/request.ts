import { extend } from 'umi-request'

const prefix = import.meta.env.VITE_API_PREFIX || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888'

const request = extend({
    prefix: prefix,
    timeout: 10000,
})

// 请求拦截器：注入 Admin Token
request.interceptors.request.use((url, options) => {
    const token = localStorage.getItem('admin_token')
    const headers = { ...options.headers }
    if (token) {
        (headers as Record<String, String>)['Authorization'] = `Bearer ${token}`
    }
    return {
        url,
        options: { ...options, headers }
    }
})

// 响应拦截器：处理 401 身份过期
request.interceptors.response.use(async (response) => {
    if (response.status === 401) {
        localStorage.removeItem('admin_token')
        if (!window.location.hash.includes('#/admin/login')) {
            window.location.hash = '#/admin/login'
        }
    }
    return response
})

export default request
