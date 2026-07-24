<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2 class="title">同济大学天行平台</h2>
        <p class="subtitle">管理后台系统登录</p>
      </div>

      <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" class="login-form" @keyup.enter="handleLogin">
        <el-form-item prop="userName">
          <el-input v-model="loginForm.userName" placeholder="管理员账号 (admin)" prefix-icon="User" size="large" clearable />
        </el-form-item>

        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="管理员密码" prefix-icon="Lock" size="large" show-password clearable />
        </el-form-item>

        <el-form-item>
          <el-button :loading="loading" type="primary" size="large" class="login-btn" @click="handleLogin">
            {{ loading ? '登录验证中...' : '立 即 登 录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <span>&copy; 2026 同济大学天行气象预测平台</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const loginFormRef = ref()
const loading = ref(false)

const loginForm = reactive({
  userName: '',
  password: ''
})

const loginRules = {
  userName: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    loading.value = true
    try {
      const res = await request.post('/admin/login', {
        data: {
          userName: loginForm.userName,
          password: loginForm.password
        }
      })

      if (res && res.code === 200) {
        ElMessage.success('登录成功！Welcome, ' + (res.data.nickName || res.data.userName))
        localStorage.setItem('admin_token', res.data.token)
        localStorage.setItem('admin_user', JSON.stringify(res.data))
        router.push('/admin/dashboard')
      } else {
        ElMessage.error(res?.msg || '登录失败，请检查用户名和密码')
      }
    } catch (err: any) {
      ElMessage.error(err?.data?.msg || err?.message || '网络异常，请确认后端服务已启动')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  background-size: cover;
}

.login-box {
  width: 420px;
  padding: 40px;
  background: rgba(30, 41, 59, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  color: #f8fafc;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  letter-spacing: 1px;
}

.subtitle {
  color: #94a3b8;
  font-size: 14px;
  margin: 0;
}

.login-form {
  margin-top: 20px;
}

.login-btn {
  width: 100%;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  margin-top: 10px;
}

.login-btn:hover {
  opacity: 0.9;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  color: #64748b;
  font-size: 12px;
}
</style>
