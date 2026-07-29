import { createApp } from 'vue'
import * as echarts from 'echarts'
import './style.less'
import App from './App.vue'
import router from './router'
import 'element-plus/dist/index.css'
import './assets/global.scss'

// vue-echarts 使用 ECharts 的同一运行时；加载完整入口以注册 CanvasRenderer
// 以及后端 option 可能用到的各类图表组件。
void echarts

createApp(App)
    .use(router)
    .mount('#app')
