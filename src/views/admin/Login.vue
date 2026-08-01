<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import { getAdminApiError, loginAdmin } from '@/api/admin'
import { saveAdminSession } from '@/utils/adminAuth'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function submit() {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning('请输入管理员账号和密码')
    return
  }
  loading.value = true
  try {
    const session = await loginAdmin(form.username.trim(), form.password)
    saveAdminSession(session.token, session.expiresIn)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/evaluations'
    await router.replace(redirect)
  } catch (error) {
    ElMessage.error(getAdminApiError(error, '登录失败'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="brand-mark">TX</div>
      <h1>预报评估管理</h1>
      <p>管理员登录后可发布、更新和删除评估数据</p>
      <el-form :model="form" size="large" @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="form.username" :prefix-icon="User" placeholder="管理员账号" autocomplete="username" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            :prefix-icon="Lock"
            placeholder="密码"
            type="password"
            show-password
            autocomplete="current-password"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button class="login-button" type="primary" :loading="loading" @click="submit">登录</el-button>
      </el-form>
      <router-link class="back-link" :to="{ name: 'home' }">返回公开站点</router-link>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 18% 15%, rgba(45, 141, 210, 0.28), transparent 38%),
    linear-gradient(145deg, #071629, #103d62 58%, #0a6c87);
}
.login-card {
  width: min(420px, 100%);
  padding: 42px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.28);
}
.brand-mark {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  color: white;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #1460a8, #23a3b8);
}
h1 { margin: 22px 0 8px; color: #102a43; font-size: 27px; }
p { margin: 0 0 28px; color: #66788a; line-height: 1.7; }
.login-button { width: 100%; }
.back-link { display: block; margin-top: 22px; color: #3d739e; text-align: center; text-decoration: none; }
</style>
