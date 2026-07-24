<template>
  <div class="dashboard-layout">
    <el-container style="height: 100vh;">
      <el-header class="header">
        <div class="header-left">
          <span class="logo-title">天行气象预测平台 - 管理后台</span>
        </div>
        <div class="header-right">
          <span class="user-info">欢迎，{{ userInfo?.nickName || userInfo?.userName || '管理员' }}</span>
          <el-button type="danger" size="small" plain @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>

      <el-main class="main-content">
        <el-card class="welcome-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>系统概览</span>
            </div>
          </template>
          <p>管理员鉴权与 BCrypt + JWT 令牌体系已正常启动运行！</p>
          <el-descriptions border :column="2" style="margin-top: 20px;">
            <el-descriptions-item label="管理员账号">{{ userInfo?.userName || 'admin' }}</el-descriptions-item>
            <el-descriptions-item label="管理员昵称">{{ userInfo?.nickName || '天行管理员' }}</el-descriptions-item>
            <el-descriptions-item label="密码安全加密算法">BCrypt Password Hash</el-descriptions-item>
            <el-descriptions-item label="会话认证方式">Stateless JWT Token</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userInfo = ref<any>(null)

onMounted(() => {
  const userStr = localStorage.getItem('admin_user')
  if (userStr) {
    try {
      userInfo.value = JSON.parse(userStr)
    } catch (e) {
      userInfo.value = null
    }
  }
})

const handleLogout = () => {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  ElMessage.info('已退出登录')
  router.push('/admin/login')
}
</script>

<style scoped>
.header {
  background-color: #1e293b;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #334155;
}

.logo-title {
  font-size: 18px;
  font-weight: bold;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  font-size: 14px;
  color: #cbd5e1;
}

.main-content {
  background-color: #0f172a;
  color: #f8fafc;
  padding: 24px;
}

.welcome-card {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #334155;
  color: #f8fafc;
}

:deep(.el-descriptions__cell) {
  background-color: #1e293b !important;
  color: #e2e8f0 !important;
  border-color: #334155 !important;
}
</style>
