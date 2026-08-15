<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { AxiosProgressEvent } from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Check, CopyDocument, Link, Refresh, SwitchButton, UploadFilled, WarningFilled } from '@element-plus/icons-vue'
import { clearAdminSession } from '@/utils/adminAuth'
import adminRequest from '@/utils/adminRequest'
import bg from '@/assets/bg.png'
import logoImg from '@/assets/logo-img.png'
import logoText from '@/assets/logo-txt-b.png'

interface ImageTypeOption {
  value: string
  label: string
  period: string
  requiresDay: boolean
  description: string
}

interface PublishedResponse {
  id: number
  year: string
  month: string
  day?: string | null
  type: string
  paths: string[]
  verifyPath?: string | null
}

interface PreviewFile {
  uid: string
  name: string
  size: string
  url: string
  revoke: boolean
}

interface RemoteUrlCheck {
  value: string
  valid: boolean
  source: string
  message: string
}

const fallbackTypeOptions: ImageTypeOption[] = [
  { label: 'ENSO ASC', value: 'ENSO_ASC', period: '月', requiresDay: false, description: 'ENSO 模态预测结果图' },
  { label: 'ENSO MC', value: 'ENSO_MC', period: '月', requiresDay: false, description: 'ENSO 模态预测结果图' },
  { label: 'ENSO GTC', value: 'ENSO_GTC', period: '月', requiresDay: false, description: 'ENSO 模态预测结果图' },
  { label: '海冰 SIC', value: 'SIC', period: '日', requiresDay: true, description: '海冰密集度预测结果图' },
  { label: 'NAO 格点图', value: 'NAO', period: '月', requiresDay: false, description: 'NAO 格点预测结果图' },
  { label: '全球天气 MSLP', value: 'WEA_MSLP', period: '日', requiresDay: true, description: '海平面气压预测结果图' },
  { label: '全球天气 T2M', value: 'WEA_T2M', period: '日', requiresDay: true, description: '2 米气温预测结果图' },
  { label: '全球天气 TP', value: 'WEA_TP', period: '日', requiresDay: true, description: '地表降水预测结果图' },
  { label: '全球天气 U10', value: 'WEA_U10', period: '日', requiresDay: true, description: '10 米风预测结果图' },
]

const remoteSourceOptions = [
  { label: 'ECMWF Charts', value: 'ecmwf', keyword: 'ecmwf', hint: 'charts.ecmwf.int' },
  { label: 'Copernicus', value: 'copernicus', keyword: 'copernicus', hint: 'copernicus' },
]
const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const allowedImagePattern = /\.(png|jpe?g|webp|gif)$/i
const maxImageSize = 50 * 1024 * 1024

const router = useRouter()
const loading = ref(false)
const typeLoading = ref(false)
const typeLoadFailed = ref(false)
const fileList = ref<any[]>([])
const imageTypeOptions = ref<ImageTypeOption[]>(fallbackTypeOptions)
const published = ref<PublishedResponse | null>(null)
const lastError = ref('')
const progressPercent = ref(0)
const manualPreviews = ref<PreviewFile[]>([])
const currentAdmin = computed(() => localStorage.getItem('tianxing_admin_username') || 'admin')

const form = reactive<{
  source: 'manual' | 'ecmwfRaw' | 'ecmwfUrl'
  remoteSource: 'ecmwf' | 'copernicus'
  type: string
  year: number
  month: number
  day: number | undefined
  imageUrls: string
  forecastDate: string
  runHour: number
  step: number
  variable: string
  dataFormat: 'GRIB' | 'NETCDF'
  dataUrl: string
}>({
  source: 'manual',
  remoteSource: 'ecmwf',
  type: 'ENSO_ASC',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  day: undefined,
  imageUrls: '',
  forecastDate: new Date().toISOString().slice(0, 10),
  runHour: 0,
  step: 24,
  variable: '2t',
  dataFormat: 'GRIB',
  dataUrl: '',
})

const selectedType = computed(() => imageTypeOptions.value.find((item) => item.value === form.type))
const selectedRemoteSource = computed(() => remoteSourceOptions.find((item) => item.value === form.remoteSource))
const requiresDay = computed(() => selectedType.value?.requiresDay || false)
const imageUrlCount = computed(() => parseImageUrls(form.imageUrls).length)
const remoteUrlChecks = computed(() => parseImageUrls(form.imageUrls).map(validateRemoteUrl))
const remoteUrlErrors = computed(() => remoteUrlChecks.value.filter((item) => !item.valid))
const targetSummary = computed(() => {
  const date = requiresDay.value
    ? `${form.year}年${form.month}月${form.day || '-'}日`
    : `${form.year}年${form.month}月`
  return `${selectedType.value?.label || form.type} / ${date}`
})
const progressText = computed(() => {
  if (form.source === 'manual') {
    return progressPercent.value >= 100 ? '图片上传完成' : '正在上传图片'
  }
  if (form.source === 'ecmwfRaw') {
    return progressPercent.value >= 100 ? '原始数据出图完成' : '正在下载并解析 ECMWF 原始数据'
  }
  return progressPercent.value >= 100 ? '远程图片拉取完成' : '后端正在拉取远程图片'
})

watch(
  () => form.type,
  (type) => {
    const variableByType: Record<string, string> = {
      WEA_MSLP: 'msl',
      WEA_T2M: '2t',
      WEA_TP: 'tp',
      WEA_U10: '10u',
      SIC: 'siconc',
    }
    form.variable = variableByType[type] || form.variable
  },
  { immediate: true },
)

onMounted(fetchTypeOptions)
onBeforeUnmount(releaseManualPreviews)

watch(
  () => form.type,
  () => {
    if (!requiresDay.value) {
      form.day = undefined
      return
    }
    if (!form.day) {
      form.day = 1
    }
  },
  { immediate: true },
)

watch(
  fileList,
  (files) => {
    releaseManualPreviews()
    manualPreviews.value = files.map((file) => {
      const raw = file.raw
      const url = raw ? URL.createObjectURL(raw) : (file.url || '')
      return {
        uid: String(file.uid || file.name),
        name: file.name,
        size: formatSize(file.size),
        url,
        revoke: Boolean(raw && url),
      }
    })
  },
  { deep: true },
)

async function fetchTypeOptions() {
  typeLoading.value = true
  typeLoadFailed.value = false
  try {
    const response = await adminRequest.get('/admin/forecast-result-images/types')
    const payload = response.data?.data || response.data
    if (Array.isArray(payload) && payload.length > 0) {
      imageTypeOptions.value = payload
    }
  } catch (_error) {
    typeLoadFailed.value = true
  } finally {
    typeLoading.value = false
  }
}

function parseImageUrls(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function validateRemoteUrl(value: string): RemoteUrlCheck {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { value, valid: false, source: '-', message: '仅支持 HTTP/HTTPS 地址' }
    }

    const host = url.hostname.toLowerCase()
    const option = selectedRemoteSource.value
    if (!option || !host.includes(option.keyword)) {
      return {
        value,
        valid: false,
        source: host || '-',
        message: `当前来源应包含 ${option?.hint || 'ECMWF/Copernicus'} 域名`,
      }
    }

    return {
      value,
      valid: true,
      source: option.label,
      message: '地址可提交',
    }
  } catch (_error) {
    return { value, valid: false, source: '-', message: '地址格式不正确' }
  }
}

function validateSelectedFiles() {
  const invalid = fileList.value.find((file) => {
    const type = file.raw?.type
    return !(allowedImageTypes.includes(type) || allowedImagePattern.test(file.name))
  })
  if (invalid) {
    ElMessage.warning(`仅支持 PNG / JPG / WebP / GIF：${invalid.name}`)
    return false
  }

  const oversized = fileList.value.find((file) => file.size > maxImageSize)
  if (oversized) {
    ElMessage.warning(`单张图片不能超过 50MB：${oversized.name}`)
    return false
  }

  return true
}

function validateForm() {
  if (!form.year || !form.month || !form.type) {
    ElMessage.warning('请填写年份、月份和类型')
    return false
  }
  if (requiresDay.value && !form.day) {
    ElMessage.warning('请填写日期')
    return false
  }
  if (form.source === 'manual' && fileList.value.length === 0) {
    ElMessage.warning('请选择图片文件')
    return false
  }
  if (form.source === 'manual' && !validateSelectedFiles()) {
    return false
  }
  if (form.source === 'ecmwfUrl' && imageUrlCount.value === 0) {
    ElMessage.warning('请填写 ECMWF 图片地址')
    return false
  }
  if (form.source === 'ecmwfUrl' && remoteUrlErrors.value.length > 0) {
    ElMessage.warning(remoteUrlErrors.value[0].message)
    return false
  }
  return true
}

async function submitPublish() {
  if (!validateForm()) {
    return
  }

  loading.value = true
  lastError.value = ''
  progressPercent.value = form.source === 'manual' ? 0 : 18
  published.value = null
  try {
    const response = form.source === 'manual'
      ? await publishManual()
      : form.source === 'ecmwfRaw'
        ? await publishFromEcmwfRaw()
        : await publishFromEcmwf()
    published.value = response.data?.data || response.data
    progressPercent.value = 100
    ElMessage.success(response.data?.message || '发布成功')
    fileList.value = []
  } catch (error: any) {
    lastError.value = error?.response?.data?.message || error?.response?.data?.error || '发布失败'
    progressPercent.value = 0
    ElMessage.error(lastError.value)
  } finally {
    loading.value = false
  }
}

function retryPublish() {
  submitPublish()
}

function publishManual() {
  const data = new FormData()
  data.append('year', String(form.year))
  data.append('month', String(form.month))
  data.append('type', form.type)
  if (requiresDay.value && form.day) {
    data.append('day', String(form.day))
  }
  fileList.value.forEach((file) => {
    if (file.raw) {
      data.append('files', file.raw)
    }
  })
  return adminRequest.post('/admin/forecast-result-images/manual', data, {
    onUploadProgress: updateUploadProgress,
  })
}

function publishFromEcmwf() {
  progressPercent.value = 36
  return adminRequest.post('/admin/forecast-result-images/ecmwf', {
    year: String(form.year),
    month: String(form.month),
    day: requiresDay.value && form.day ? String(form.day) : undefined,
    type: form.type,
    imageUrls: parseImageUrls(form.imageUrls),
  })
}

function publishFromEcmwfRaw() {
  progressPercent.value = 12
  return adminRequest.post('/admin/forecast-result-images/ecmwf/raw', {
    year: String(form.year),
    month: String(form.month),
    day: requiresDay.value && form.day ? String(form.day) : undefined,
    type: form.type,
    data: {
      forecastDate: form.forecastDate,
      runHour: form.runHour,
      step: form.step,
      variable: form.variable,
      format: form.dataFormat,
      dataUrl: form.dataUrl.trim() || undefined,
      title: `${selectedType.value?.label || form.type} ${form.forecastDate} +${form.step}h`,
    },
  })
}

function updateUploadProgress(event: AxiosProgressEvent) {
  if (!event.total) {
    progressPercent.value = Math.max(progressPercent.value, 12)
    return
  }
  progressPercent.value = Math.min(95, Math.max(1, Math.round((event.loaded * 100) / event.total)))
}

async function logout() {
  try {
    await adminRequest.post('/admin/auth/logout')
  } catch (_error) {
    // Local logout still clears expired or unreachable sessions.
  }
  clearAdminSession()
  router.push('/admin/login')
}

async function copyText(value?: string | null) {
  if (!value) {
    return
  }
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success('已复制')
  } catch (_error) {
    ElMessage.warning('浏览器未允许复制')
  }
}

function formatSize(size?: number) {
  if (!size) {
    return '-'
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function releaseManualPreviews() {
  manualPreviews.value.forEach((file) => {
    if (file.revoke) {
      URL.revokeObjectURL(file.url)
    }
  })
  manualPreviews.value = []
}
</script>

<template>
  <main
    class="admin-page"
    :style="{ backgroundImage: `linear-gradient(180deg, rgba(8, 28, 46, 0.70), rgba(245, 248, 251, 0.96) 360px), url(${bg})` }"
  >
    <header class="admin-topbar">
      <div class="brand">
        <img class="brand-logo" :src="logoImg" alt="天行" />
        <img class="brand-text" :src="logoText" alt="天行气象预测平台" />
        <span>后台系统</span>
      </div>
        <div class="admin-actions">
          <el-button size="small" @click="router.push('/admin/evaluations')">📊 评估数据库</el-button>
          <el-button size="small" type="primary">🖼️ 结果图发布</el-button>
          <el-button size="small" @click="router.push({ name: 'home' })">🏠 公开站点</el-button>
          <span>{{ currentAdmin }}</span>
          <el-button :icon="SwitchButton" text @click="logout">退出</el-button>
        </div>
    </header>

    <section class="admin-hero">
      <div>
        <h1>发布预报结果图</h1>
        <p>{{ selectedType?.description || '预报结果图' }}</p>
      </div>
      <div class="hero-facts">
        <div>
          <strong>{{ form.source === 'manual' ? '手动上传' : form.source === 'ecmwfRaw' ? '原始数据' : '远程图片' }}</strong>
          <span>来源</span>
        </div>
        <div>
          <strong>{{ selectedType?.period || '-' }}</strong>
          <span>粒度</span>
        </div>
        <div>
          <strong>{{ form.source === 'manual' ? fileList.length : form.source === 'ecmwfRaw' ? 1 : imageUrlCount }}</strong>
          <span>图片</span>
        </div>
      </div>
    </section>

    <section class="admin-workbench">
      <aside class="flow-panel">
        <div class="flow-item is-active">
          <span>1</span>
          <div>
            <strong>来源</strong>
            <p>{{ form.source === 'manual' ? '本地图片' : form.source === 'ecmwfRaw' ? 'ECMWF GRIB/NetCDF' : '远程图片' }}</p>
          </div>
        </div>
        <div class="flow-item is-active">
          <span>2</span>
          <div>
            <strong>类型与时间</strong>
            <p>{{ targetSummary }}</p>
          </div>
        </div>
        <div class="flow-item" :class="{ 'is-active': form.source === 'manual' ? fileList.length > 0 : form.source === 'ecmwfRaw' ? Boolean(form.forecastDate && form.variable) : imageUrlCount > 0 }">
          <span>3</span>
          <div>
            <strong>发布内容</strong>
            <p>{{ form.source === 'manual' ? `${fileList.length} 个文件` : form.source === 'ecmwfRaw' ? `${form.variable} / +${form.step}h` : `${imageUrlCount} 个地址` }}</p>
          </div>
        </div>
        <button class="refresh-types" type="button" @click="fetchTypeOptions">
          <Refresh />
          <span>{{ typeLoading ? '同步中' : '同步类型' }}</span>
        </button>
        <p v-if="typeLoadFailed" class="flow-note">已使用本地类型配置</p>
      </aside>

      <section class="publish-panel">
        <el-form label-position="top">
          <div class="form-grid">
          <el-form-item label="来源">
              <el-radio-group v-model="form.source">
                <el-radio-button label="manual">手动上传</el-radio-button>
                <el-radio-button label="ecmwfRaw">原始数据出图</el-radio-button>
                <el-radio-button label="ecmwfUrl">成品图 URL</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="form.source === 'ecmwfUrl'" label="远程来源">
              <el-select v-model="form.remoteSource">
                <el-option
                  v-for="item in remoteSourceOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="图片类型">
              <el-select v-model="form.type" filterable>
                <el-option
                  v-for="item in imageTypeOptions"
                  :key="item.value"
                  :label="`${item.label}（${item.period}）`"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="年份">
              <el-input-number v-model="form.year" :min="1900" :max="2200" controls-position="right" />
            </el-form-item>

            <el-form-item label="月份">
              <el-input-number v-model="form.month" :min="1" :max="12" controls-position="right" />
            </el-form-item>

            <el-form-item v-if="requiresDay" label="日期">
              <el-input-number v-model="form.day" :min="1" :max="31" controls-position="right" />
            </el-form-item>
          </div>

          <div v-if="form.source === 'ecmwfRaw'" class="raw-data-grid">
            <el-form-item label="预报日期">
              <el-date-picker v-model="form.forecastDate" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="起报时次">
              <el-select v-model="form.runHour">
                <el-option v-for="hour in [0, 6, 12, 18]" :key="hour" :label="`${String(hour).padStart(2, '0')} UTC`" :value="hour" />
              </el-select>
            </el-form-item>
            <el-form-item label="预报步长">
              <el-input-number v-model="form.step" :min="0" :max="360" :step="6" controls-position="right" />
            </el-form-item>
            <el-form-item label="数据格式">
              <el-segmented v-model="form.dataFormat" :options="['GRIB', 'NETCDF']" />
            </el-form-item>
            <el-form-item label="变量短名">
              <el-input v-model="form.variable" placeholder="2t / msl / tp / 10u" />
            </el-form-item>
            <el-form-item class="raw-url-field" label="原始数据地址（留空自动生成 Open Data 地址）">
              <el-input v-model="form.dataUrl" placeholder="https://data.ecmwf.int/forecasts/..." />
            </el-form-item>
          </div>

          <el-form-item v-if="form.source === 'manual'" label="图片文件">
            <el-upload
              v-model:file-list="fileList"
              class="admin-upload"
              accept="image/png,image/jpeg,image/webp,image/gif"
              :auto-upload="false"
              :show-file-list="false"
              drag
              multiple
            >
              <el-icon class="upload-icon"><UploadFilled /></el-icon>
              <div class="upload-title">选择或拖入图片</div>
              <template #tip>
                <div class="upload-tip">PNG / JPG / WebP / GIF</div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item v-else-if="form.source === 'ecmwfUrl'" label="ECMWF 图片地址">
            <el-input
              v-model="form.imageUrls"
              type="textarea"
              :rows="8"
              placeholder="https://charts.ecmwf.int/..."
            />
          </el-form-item>

          <div v-if="manualPreviews.length" class="preview-grid">
            <article v-for="file in manualPreviews" :key="file.uid" class="preview-card">
              <img :src="file.url" :alt="file.name" />
              <div class="preview-meta">
                <strong>{{ file.name }}</strong>
                <small>{{ file.size }}</small>
              </div>
            </article>
          </div>

          <div v-if="form.source === 'ecmwfUrl' && remoteUrlChecks.length" class="url-check-list">
            <div
              v-for="(item, index) in remoteUrlChecks"
              :key="`${item.value}-${index}`"
              class="url-check-row"
              :class="{ 'is-valid': item.valid, 'is-error': !item.valid }"
            >
              <component :is="item.valid ? Check : WarningFilled" />
              <div>
                <strong>{{ item.source }}</strong>
                <p>{{ item.value }}</p>
                <small>{{ item.message }}</small>
              </div>
            </div>
          </div>

          <div v-if="loading || progressPercent > 0" class="publish-progress">
            <el-progress
              :percentage="progressPercent"
              :indeterminate="loading && form.source !== 'manual'"
              :status="progressPercent >= 100 ? 'success' : undefined"
            />
            <span>{{ progressText }}</span>
          </div>

          <div v-if="lastError" class="error-panel">
            <WarningFilled />
            <div>
              <strong>发布失败</strong>
              <p>{{ lastError }}</p>
            </div>
            <el-button text type="primary" :icon="Refresh" :disabled="loading" @click="retryPublish">重试</el-button>
          </div>

          <div class="actions">
            <div>
              <strong>{{ targetSummary }}</strong>
              <span>{{ form.source === 'manual' ? `${fileList.length} 个文件` : form.source === 'ecmwfRaw' ? `${form.variable} / +${form.step}h` : `${imageUrlCount} 个地址` }}</span>
            </div>
            <el-button type="primary" :loading="loading" @click="submitPublish">发布</el-button>
          </div>
        </el-form>
      </section>
    </section>

    <section v-if="published" class="result-panel">
      <header>
        <div>
          <strong>{{ published.type }}</strong>
          <span>{{ published.year }}-{{ published.month }}{{ published.day ? `-${published.day}` : '' }}</span>
        </div>
        <span class="success-mark">发布成功</span>
      </header>

      <div v-if="published.verifyPath" class="verify-row">
        <Link />
        <code>{{ published.verifyPath }}</code>
        <button type="button" @click="copyText(published.verifyPath)">
          <CopyDocument />
          <span>复制</span>
        </button>
      </div>

      <ol>
        <li v-for="path in published.paths" :key="path">
          <code>{{ path }}</code>
          <button type="button" @click="copyText(path)">
            <CopyDocument />
            <span>复制</span>
          </button>
        </li>
      </ol>
    </section>
  </main>
</template>

<style scoped lang="scss">
.admin-page {
  min-height: 100vh;
  background-size: cover;
  background-position: center top;
  color: #172033;
  padding: 24px 28px 42px;
}

.admin-topbar,
.admin-hero,
.admin-workbench,
.result-panel {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.admin-topbar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff;
}

.brand,
.admin-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.brand-text {
  height: 28px;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

.brand span,
.admin-actions span {
  color: rgba(255, 255, 255, 0.84);
  font-size: 14px;
}

.admin-actions :deep(.el-button) {
  color: #3a3a3a;
}

.admin-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 50px 0 34px;
  color: #ffffff;
}

.admin-hero h1 {
  margin: 0 0 10px;
  font-size: 44px;
  font-family: 'STXinwei', 'Microsoft YaHei', sans-serif;
  font-weight: 400;
  letter-spacing: 0;
}

.admin-hero p {
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 18px;
}

.hero-facts {
  display: grid;
  grid-template-columns: repeat(3, 112px);
  gap: 10px;
}

.hero-facts div {
  min-height: 72px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
}

.hero-facts strong,
.hero-facts span {
  display: block;
}

.hero-facts strong {
  margin-bottom: 8px;
  font-size: 18px;
}

.hero-facts span {
  color: rgba(255, 255, 255, 0.68);
  font-size: 13px;
}

.admin-workbench {
  display: grid;
  grid-template-columns: 290px 1fr;
  gap: 18px;
  align-items: start;
}

.flow-panel,
.publish-panel,
.result-panel {
  border: 1px solid rgba(45, 141, 210, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 34px rgba(21, 57, 82, 0.13);
}

.flow-panel {
  padding: 18px;
}

.flow-item {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e4edf4;
}

.flow-item > span {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #7890a3;
  background: #edf3f8;
  font-weight: 700;
}

.flow-item.is-active > span {
  color: #ffffff;
  background: #2d8dd2;
}

.flow-item strong,
.flow-item p {
  display: block;
  margin: 0;
}

.flow-item p {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.refresh-types,
.verify-row button,
.result-panel li button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: #2d8dd2;
  cursor: pointer;
}

.refresh-types {
  margin-top: 16px;
  padding: 0;
  font-size: 14px;
}

.refresh-types svg,
.verify-row svg,
.result-panel li svg {
  width: 16px;
  height: 16px;
}

.flow-note {
  margin: 10px 0 0;
  color: #b54708;
  font-size: 13px;
}

.publish-panel {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 14px 18px;
  align-items: end;
}

.admin-upload {
  width: 100%;
}

.raw-data-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 14px 18px;
}

.raw-url-field {
  grid-column: span 3;
}

.upload-icon {
  margin-top: 18px;
  font-size: 38px;
  color: #2d8dd2;
}

.upload-title {
  margin-bottom: 6px;
  color: #344054;
}

.upload-tip {
  color: #667085;
  font-size: 13px;
}

.file-list {
  display: grid;
  gap: 8px;
  margin: 4px 0 18px;
}

.file-row {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f1f7fb;
  color: #344054;
}

.file-row svg {
  width: 16px;
  height: 16px;
  color: #2d8dd2;
}

.file-row small {
  color: #667085;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin: 4px 0 18px;
}

.preview-card {
  overflow: hidden;
  border: 1px solid #d7e6f1;
  border-radius: 8px;
  background: #f8fbfd;
  box-shadow: 0 8px 20px rgba(19, 50, 76, 0.08);
}

.preview-card img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  background: #dfeaf3;
}

.preview-meta {
  display: grid;
  gap: 4px;
  padding: 10px 12px 12px;
}

.preview-meta strong,
.preview-meta small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-meta small {
  color: #667085;
}

.url-check-list {
  display: grid;
  gap: 10px;
  margin: 2px 0 18px;
}

.url-check-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f7fafc;
  border: 1px solid #e1ebf3;
}

.url-check-row svg {
  margin-top: 2px;
  width: 16px;
  height: 16px;
}

.url-check-row.is-valid svg {
  color: #16835f;
}

.url-check-row.is-error svg {
  color: #c83e4d;
}

.url-check-row strong,
.url-check-row p,
.url-check-row small {
  display: block;
  margin: 0;
}

.url-check-row strong {
  margin-bottom: 4px;
}

.url-check-row p {
  color: #344054;
  word-break: break-all;
}

.url-check-row small {
  margin-top: 4px;
  color: #667085;
}

.publish-progress {
  display: grid;
  gap: 8px;
  margin: 2px 0 18px;
  padding: 12px 14px;
  border: 1px solid #dbe7f1;
  border-radius: 8px;
  background: #f7fbfe;
}

.publish-progress span {
  color: #667085;
  font-size: 13px;
}

.error-panel {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #f3c1c7;
  border-radius: 8px;
  background: #fff5f6;
  color: #9f1d2d;
}

.error-panel svg {
  margin-top: 2px;
  width: 16px;
  height: 16px;
}

.error-panel strong,
.error-panel p {
  margin: 0;
}

.error-panel p {
  margin-top: 4px;
  color: #aa3141;
  word-break: break-all;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding-top: 18px;
  border-top: 1px solid #e4edf4;
}

.actions strong,
.actions span {
  display: block;
}

.actions strong {
  margin-bottom: 4px;
}

.actions span {
  color: #667085;
  font-size: 13px;
}

.actions :deep(.el-button) {
  min-width: 132px;
}

.result-panel {
  margin-top: 18px;
  padding: 22px;
}

.result-panel header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.result-panel header strong,
.result-panel header span {
  display: block;
}

.result-panel header span {
  margin-top: 5px;
  color: #667085;
}

.success-mark {
  color: #16835f !important;
  font-weight: 700;
}

.verify-row,
.result-panel li {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #e4edf4;
}

.result-panel ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.verify-row code,
.result-panel li code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #344054;
}

@media (max-width: 920px) {
  .admin-page {
    padding: 18px;
  }

  .admin-hero {
    display: block;
  }

  .hero-facts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 24px;
  }

  .admin-workbench {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .raw-data-grid {
    grid-template-columns: 1fr;
  }

  .raw-url-field {
    grid-column: auto;
  }

  .brand-text {
    display: none;
  }
}
</style>
