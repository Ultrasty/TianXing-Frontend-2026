<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Lock, User } from '@element-plus/icons-vue'
import axios from 'axios'
import { adminHttp } from '@/api/admin'
import bg from '@/assets/bg.png'
import logoImg from '@/assets/logo-img.png'
import logoText from '@/assets/logo-txt-b.png'

import { saveAdminSession } from '@/utils/adminAuth'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const apiBase = computed(() => (
  import.meta.env.VITE_API_PREFIX
  || import.meta.env.VITE_API_BASE_URL
  || axios.defaults.baseURL
  || '未配置'
))

const form = reactive({
  username: 'admin',
  password: '',
})

async function submitLogin() {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const response = await adminHttp.post('/admin/auth/login', {
      username: form.username.trim(),
      password: form.password,
    })
    const payload = response.data?.data || response.data
    saveAdminSession(payload.token, payload.expiresIn || 28800)
    localStorage.setItem('tianxing_admin_token', payload.token)
    localStorage.setItem('tianxing_admin_username', payload.username || form.username.trim())
    ElMessage.success(response.data?.message || '登录成功')
    const redirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : '/admin/evaluations'
    await router.push(redirect)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main
    class="admin-login"
    :style="{ backgroundImage: `linear-gradient(120deg, rgba(5, 20, 38, 0.78), rgba(7, 41, 70, 0.42)), url(${bg})` }"
  >
    <section class="brand-panel">
      <div class="brand-mark">
        <img class="brand-logo" :src="logoImg" alt="天行" />
        <img class="brand-text" :src="logoText" alt="天行气象预测平台" />
      </div>
      <h1>后台系统</h1>
      <p>管理员登录</p>
    </section>

    <section class="login-panel" @keyup.enter="submitLogin">
      <div class="login-heading">
        <span>Admin</span>
        <h2>进入管理后台</h2>
      </div>

      <el-form label-position="top">
        <el-form-item label="用户名">
          <el-input
            v-model="form.username"
            :prefix-icon="User"
            autocomplete="username"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            :prefix-icon="Lock"
            autocomplete="current-password"
            show-password
            type="password"
          />
        </el-form-item>
        <el-button
          class="login-button"
          type="primary"
          :icon="ArrowRight"
          :loading="loading"
          @click="submitLogin"
        >
          登录
        </el-button>
      </el-form>

      <div class="api-line">
        <span>API</span>
        <code>{{ apiBase }}</code>
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.admin-login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 460px);
  gap: 42px;
  align-items: center;
  padding: 56px 8vw;
  background-size: cover;
  background-position: center;
  color: #ffffff;
}

.brand-panel {
  max-width: 520px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 34px;
}

.brand-logo {
  width: 62px;
  height: 62px;
  object-fit: contain;
}

.brand-text {
  height: 44px;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

.brand-panel h1 {
  margin: 0 0 14px;
  font-size: 52px;
  font-family: 'STXinwei', 'Microsoft YaHei', sans-serif;
  font-weight: 400;
  letter-spacing: 0;
}

.brand-panel p {
  margin: 0;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.78);
}

.login-panel {
  width: 100%;
  padding: 34px;
  border: 1px solid rgba(45, 141, 210, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 22px 52px rgba(3, 24, 43, 0.28);
  color: #152033;
  backdrop-filter: blur(10px);
}

.login-heading {
  margin-bottom: 26px;
}

.login-heading span {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #2d8dd2;
  font-weight: 700;
}

.login-heading h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 650;
  letter-spacing: 0;
}

.login-button {
  width: 100%;
  height: 42px;
  margin-top: 4px;
}

.api-line {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #d9e8f3;
  color: #667085;
  font-size: 12px;
}

.api-line span {
  color: #2d8dd2;
  font-weight: 700;
}

.api-line code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 860px) {
  .admin-login {
    grid-template-columns: 1fr;
    padding: 32px 20px;
  }

  .brand-panel h1 {
    font-size: 42px;
  }
}
</style>
