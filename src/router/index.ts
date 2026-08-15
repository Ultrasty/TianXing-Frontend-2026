import { createRouter, createWebHashHistory } from 'vue-router'
import { hasValidAdminSession } from '@/utils/adminAuth'
import ENSOForecastExamination from '@/views/ENSO/ForecastExamination.vue'
import ENSOForecastResult from '@/views/ENSO/ForecastResult.vue'
import GlobalWeatherForecastResult from '@/views/GlobalWeather/ForecastResult.vue'
import SeaIceForecastResult from '@/views/SeaIce/ForecastResult.vue'
import SeaIceForecastExamination from '@/views/SeaIce/ForecastExamination.vue'
import NAOForecastResult from '@/views/NAO/ForecastResult.vue'
import NAOForecastExamination from '@/views/NAO/ForecastExamination.vue'
import UserView from '@/views/user/UserView.vue'
import AdminLogin from '@/views/admin/AdminLogin.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import AdminForecastResultImagePublish from '@/views/admin/ForecastResultImagePublish.vue'
import ExaminationManage from '@/views/admin/ExaminationManage.vue'

const router = createRouter({
  history: createWebHashHistory('/tianxing'),
  routes: [
    {
      path: '/admin/login',
      name: 'AdminLogin',
      component: AdminLogin,
      meta: { title: '管理员登录' },
    },
    {
      path: '/admin/dashboard',
      name: 'AdminDashboard',
      component: AdminDashboard,
      meta: { title: '管理后台概览', requiresAdminAuth: true },
    },
    {
      path: '/admin/forecast-result-images/publish',
      name: 'AdminForecastResultImagePublish',
      component: AdminForecastResultImagePublish,
      meta: { title: '预报结果图发布', requiresAdminAuth: true },
    },
    {
      path: '/admin/evaluations',
      name: 'ExaminationManage',
      component: ExaminationManage,
      meta: { title: '预报评估数据管理', requiresAdminAuth: true },
    },
    {
      name: 'home',
      path: '/',
      component: UserView,
      redirect: { name: 'ENSO_ForecastExamination' },
      children: [
        {
          name: 'ENSO_ForecastExamination',
          meta: { title: 'ENSO_ForecastExamination' },
          path: 'ENSO_ForecastExamination',
          component: ENSOForecastExamination,
        },
        {
          name: 'ENSO_ForecastResult',
          meta: { title: 'ENSO_ForecastResult' },
          path: 'ENSO_ForecastResult',
          component: ENSOForecastResult,
        },
        {
          name: 'GlobalWeather_ForecastResult',
          meta: { title: 'GlobalWeather_ForecastResult' },
          path: 'GlobalWeather_ForecastResult',
          component: GlobalWeatherForecastResult,
        },
        {
          name: 'SeaIce_ForecastResult',
          meta: { title: 'SeaIce Forecast Result' },
          path: 'SeaIce/ForecastResult',
          component: SeaIceForecastResult,
        },
        {
          name: 'SeaIce_ForecastExamination',
          meta: { title: 'SeaIce Forecast Examination' },
          path: 'SeaIce/ForecastExamination',
          component: SeaIceForecastExamination,
        },
        {
          name: 'NAO_ForecastResult',
          meta: { title: 'NAO_ForecastResult' },
          path: 'NAO_ForecastResult',
          component: NAOForecastResult,
        },
        {
          name: 'NAO_ForecastExamination',
          meta: { title: 'NAO_ForecastExamination' },
          path: 'NAO_ForecastExamination',
          component: NAOForecastExamination,
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const authenticated = hasValidAdminSession()

  if (to.meta.requiresAdminAuth && !authenticated) {
    next({
      name: 'AdminLogin',
      query: { redirect: to.fullPath },
    })
    return
  }

  if (to.meta.guestOnly && authenticated) {
    next({ name: 'ExaminationManage' })
    return
  }

  if (typeof to.meta.title === 'string') {
    document.title = `${to.meta.title} - 天行平台`
  }

  next()
})

export default router
