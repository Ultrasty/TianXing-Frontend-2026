<script setup lang="ts">
import { RouterView } from 'vue-router'
import axios from 'axios'

// 本地开发时，请求先发送到 Vite 的 /api 代理
axios.defaults.baseURL = '/api'
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