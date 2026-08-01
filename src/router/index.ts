import { hasValidAdminSession } from '@/utils/adminAuth'
import ENSOForecastExamination from '@/views/ENSO/ForecastExamination.vue'
import ENSOForecastResult from '@/views/ENSO/ForecastResult.vue'
import GlobalWeatherForecastResult from '@/views/GlobalWeather/ForecastResult.vue'
import SeaIceForecastResult from '@/views/SeaIce/ForecastResult.vue'
import SeaIceForecastExamination from '@/views/SeaIce/ForecastExamination.vue'
import NAOForecastResult from '@/views/NAO/ForecastResult.vue'
import NAOForecastExamination from '@/views/NAO/ForecastExamination.vue'
import UserView from '@/views/user/UserView.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
    history: createWebHashHistory('/tianxing'),
    routes: [
        {
            name: 'home',
            path: '/',
            component: UserView,
            redirect: { name: 'ENSO_ForecastExamination' },
            children: [
                {
                    name: 'ENSO_ForecastExamination',
                    meta: {
                        title: 'ENSO_ForecastExamination',
                    },
                    path: 'ENSO_ForecastExamination',
                    component: ENSOForecastExamination,
                },
                {

                    name: 'ENSO_ForecastResult',
                    meta: {
                        title: 'ENSO_ForecastResult',
                    },
                    path: 'ENSO_ForecastResult',
                    component: ENSOForecastResult,
                },
                {
                    name: 'GlobalWeather_ForecastResult',
                    meta: {
                        title: 'GlobalWeather_ForecastResult',
                    },
                    path: 'GlobalWeather_ForecastResult',
                    component: GlobalWeatherForecastResult,
                },
                {
                    name: 'SeaIce_ForecastResult',
                    meta: {
                        title: 'SeaIce Forecast Result',
                    },
                    path: 'SeaIce/ForecastResult',
                    component: SeaIceForecastResult,
                },
                {
                    name: 'SeaIce_ForecastExamination',
                    meta: {
                        title: 'SeaIce Forecast Examination',
                    },
                    path: 'SeaIce/ForecastExamination',
                    component: SeaIceForecastExamination,
                },
                {
                    name: 'NAO_ForecastResult',
                    meta: {
                        title: 'NAO_ForecastResult',
                    },
                    path: 'NAO_ForecastResult',
                    component: NAOForecastResult,
                },
                {
                    name: 'NAO_ForecastExamination',
                    meta: {
                        title: 'NAO_ForecastExamination',
                    },
                    path: 'NAO_ForecastExamination',
                    component: NAOForecastExamination,
                }
            ],
        },
        {
            name: 'AdminLogin',
            path: '/admin/login',
            meta: { title: '管理员登录', guestOnly: true },
            component: () => import('@/views/admin/Login.vue'),
        },
        {
            name: 'ExaminationManage',
            path: '/admin/evaluations',
            meta: { title: '预报评估数据管理', requiresAdmin: true },
            component: () => import('@/views/admin/ExaminationManage.vue'),
        },
    ],
})

router.beforeEach((to) => {
    const authenticated = hasValidAdminSession()
    if (to.meta.requiresAdmin && !authenticated) {
        return { name: 'AdminLogin', query: { redirect: to.fullPath } }
    }
    if (to.meta.guestOnly && authenticated) {
        return { name: 'ExaminationManage' }
    }
    if (typeof to.meta.title === 'string') {
        document.title = `${to.meta.title} - 天行平台`
    }
    return true
})

export default router
