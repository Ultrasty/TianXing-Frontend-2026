import ENSOForecastExamination from '@/views/ENSO/ForecastExamination.vue'
import ENSOForecastResult from '@/views/ENSO/ForecastResult.vue'
import GlobalWeatherForecastResult from '@/views/GlobalWeather/ForecastResult.vue'

// Import SeaIce components
import SeaIce_ForecastResult from '@/views/SeaIce/ForecastResult.vue'
import SeaIce_ForecastExamination from '@/views/SeaIce/ForecastExamination.vue'

import NAOForecastResult from '@/views/NAO/ForecastResult.vue'
import NAOForecastExamination from '@/views/NAO/ForecastExamination.vue'

import UserView from '@/views/user/UserView.vue'
import AdminLogin from '@/views/admin/AdminLogin.vue'
import AdminForecastData from '@/views/admin/ForecastDataAdmin.vue'
import { ADMIN_TOKEN_KEY } from '@/api/admin'
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            name: 'AdminLogin',
            path: '/admin/login',
            component: AdminLogin,
            meta: { title: 'Admin Login' },
        },
        {
            name: 'AdminForecastData',
            path: '/admin/forecast-data',
            component: AdminForecastData,
            meta: { title: 'Forecast Data Admin', requiresAdmin: true },
        },
        {
            name: 'home',
            path: '/',
            component: UserView,
            redirect: { name: 'ENSO_ForecastExamination' },
            children: [ //这块跟headerview里面menus对应
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
                    component: SeaIce_ForecastResult,
                },
                {
                    name: 'SeaIce_ForecastExamination',
                    meta: {
                        title: 'SeaIce Forecast Examination',
                    },
                    path: 'SeaIce/ForecastExamination',
                    component: SeaIce_ForecastExamination,
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
                },
            ],
        },
    ],
})

router.beforeEach((to) => {
    if (to.meta.requiresAdmin && !localStorage.getItem(ADMIN_TOKEN_KEY)) {
        return { name: 'AdminLogin' }
    }
    if (to.name === 'AdminLogin' && localStorage.getItem(ADMIN_TOKEN_KEY)) {
        return { name: 'AdminForecastData' }
    }
    return true
})

export default router
