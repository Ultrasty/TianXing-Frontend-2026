<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ADMIN_TOKEN_KEY, adminLogin } from '@/api/admin'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)

async function submit() {
  if (!username.value.trim() || !password.value) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const res = await adminLogin(username.value.trim(), password.value)
    localStorage.setItem(ADMIN_TOKEN_KEY, res.data.token)
    ElMessage.success('登录成功')
    await router.replace({ name: 'AdminForecastData' })
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.response?.data?.error || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="admin-login-page">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="card-title">天行气象预测平台 · 管理后台</div>
      </template>

      <el-form label-position="top" @keyup.enter="submit">
        <el-form-item label="管理员用户名">
          <el-input v-model="username" autocomplete="username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            autocomplete="current-password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-button type="primary" :loading="loading" class="submit-button" @click="submit">
          登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.admin-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f6f9;
}

.login-card {
  width: 420px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
}

.submit-button {
  width: 100%;
  margin-top: 8px;
}
</style>
