<script setup lang="ts">
import { RouterView } from 'vue-router'
import axios from 'axios'

// 优先使用环境变量配置的 API 前缀，其次按环境自动回退
const apiBaseUrl = import.meta.env.VITE_API_PREFIX
  || import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? '/api' : 'https://tianxing.tongji.edu.cn/api/')

axios.defaults.baseURL = apiBaseUrl
</script>

<template>
  <RouterView />
</template>

<style scoped>
@font-face {
  font-family: 'HeaderFont';
  src: url('@/assets/fonts/fangzheng.TTF') format('truetype');
  font-weight: normal;
  font-style: normal;
}
</style>