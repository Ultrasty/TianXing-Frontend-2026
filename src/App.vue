<script setup lang="ts">
import { RouterView } from 'vue-router'
import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_PREFIX
  || import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:8888' : 'https://tianxing.tongji.edu.cn/api/')

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
