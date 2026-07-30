<script setup lang="ts">
import { RouterView } from 'vue-router'
import axios from 'axios'
axios.defaults.baseURL = import.meta.env.VITE_API_PREFIX || 'https://tianxing.tongji.edu.cn/api/'


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
