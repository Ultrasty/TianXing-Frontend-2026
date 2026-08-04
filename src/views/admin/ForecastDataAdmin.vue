<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ADMIN_TOKEN_KEY,
  adminLogout,
  createForecastData,
  deleteForecastData,
  getForecastData,
  getForecastDataById,
  getForecastMeta,
  importForecastFromEcmwf,
  importIndexFromNoaa,
  updateForecastData,
  uploadForecastData,
  type ForecastDataRecord,
} from '@/api/admin'

interface DatasetMeta {
  name: string
  table: string
  models: string[]
}

const router = useRouter()
const loading = ref(false)
const rows = ref<ForecastDataRecord[]>([])
const total = ref(0)
const datasets = ref<DatasetMeta[]>([])

const query = reactive({
  dataset: 'ENSO',
  year: '',
  month: '',
  varModel: '',
  page: 1,
  pageSize: 20,
})

const currentDataset = computed(() => datasets.value.find(item => item.name === query.dataset))
const modelOptions = computed(() => currentDataset.value?.models || [])
const isEcmwfSupported = computed(() => query.dataset === 'NAO' && query.varModel === 'grid_NAO_MCD')

const editVisible = ref(false)
const editLoading = ref(false)
const editingId = ref<number | null>(null)
const editForm = reactive({
  year: '',
  month: '',
  varModel: '',
  data: '',
})

const uploadVisible = ref(false)
const uploadLoading = ref(false)
const uploadForm = reactive({
  year: '',
  month: '',
  varModel: '',
  file: null as File | null,
})

const ecmwfVisible = ref(false)
const ecmwfLoading = ref(false)
const ecmwfForm = reactive({
  year: '',
  month: '',
  varModel: '',
  date: '',
  time: 0,
  step: 24,
  param: '2t',
  levtype: '',
  levelist: undefined as number | undefined,
  stream: '',
  type: 'fc',
  source: 'ecmwf',
  model: 'ifs',
})

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || fallback
}

function dataPreview(row: any) {
  const text = row.data_preview || ''
  if (!text) return ''
  const suffix = (row.data_length || 0) > text.length ? '…' : ''
  return `${text}${suffix}`
}

async function loadMeta() {
  const res = await getForecastMeta()
  datasets.value = res.data.datasets || []
  if (!datasets.value.some(item => item.name === query.dataset) && datasets.value.length) {
    query.dataset = datasets.value[0].name
  }
  normalizeModelSelection()
}

async function loadData() {
  loading.value = true
  try {
    const res = await getForecastData({
      dataset: query.dataset,
      year: query.year || undefined,
      month: query.month || undefined,
      varModel: query.varModel || undefined,
      page: query.page,
      pageSize: query.pageSize,
    })
    rows.value = res.data.items || []
    total.value = res.data.total || 0
  } catch (error: any) {
    ElMessage.error(errorMessage(error, '加载预报数据失败'))
  } finally {
    loading.value = false
  }
}

function normalizeModelSelection() {
  if (!query.varModel || !modelOptions.value.includes(query.varModel)) {
    query.varModel = modelOptions.value[0] || ''
  }
}

async function datasetChanged() {
  query.page = 1
  query.year = ''
  query.month = ''
  normalizeModelSelection()
  await loadData()
}

async function search() {
  query.page = 1
  await loadData()
}

async function openEdit(row: any) {
  try {
    const res = await getForecastDataById(query.dataset, row.id)
    const full = res.data as ForecastDataRecord
    editingId.value = row.id
    editForm.year = String(full.year ?? '')
    editForm.month = String(full.month ?? '')
    editForm.varModel = String(full.var_model ?? '')
    editForm.data = typeof full.data === 'string' ? full.data : JSON.stringify(full.data)
    editVisible.value = true
  } catch (error: any) {
    ElMessage.error(errorMessage(error, '加载完整数据失败'))
  }
}

async function submitEdit() {
  if (editingId.value == null) return
  editLoading.value = true
  try {
    JSON.parse(editForm.data)
    await updateForecastData(editingId.value, {
      dataset: query.dataset,
      year: editForm.year,
      month: editForm.month,
      varModel: editForm.varModel,
      data: editForm.data,
    })
    ElMessage.success('预报数据更新成功')
    editVisible.value = false
    await loadData()
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      ElMessage.error('data 不是合法 JSON')
    } else {
      ElMessage.error(errorMessage(error, '更新失败'))
    }
  } finally {
    editLoading.value = false
  }
}

async function removeRow(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${query.dataset} / ${row.year}-${row.month} / ${row.var_model}（ID=${row.id}）吗？此操作不可恢复。`,
      '删除预报数据',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    await deleteForecastData(query.dataset, row.id)
    ElMessage.success('删除成功')
    if (rows.value.length === 1 && query.page > 1) query.page--
    await loadData()
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(errorMessage(error, '删除失败'))
  }
}

function openUpload() {
  uploadForm.year = query.year || new Date().getFullYear().toString()
  uploadForm.month = query.month || String(new Date().getMonth() + 1)
  uploadForm.varModel = query.varModel || modelOptions.value[0] || ''
  uploadForm.file = null
  uploadVisible.value = true
}

function onUploadFileChange(file: any) {
  uploadForm.file = file?.raw || null
}

async function submitUpload() {
  if (!uploadForm.file) {
    ElMessage.warning('请选择 JSON 文件')
    return
  }
  uploadLoading.value = true
  try {
    const formData = new FormData()
    formData.append('dataset', query.dataset)
    formData.append('year', uploadForm.year)
    formData.append('month', uploadForm.month)
    formData.append('varModel', uploadForm.varModel)
    formData.append('file', uploadForm.file)
    await uploadForecastData(formData)
    ElMessage.success('新预报数据发布成功')
    uploadVisible.value = false
    await loadData()
  } catch (error: any) {
    const msg = errorMessage(error, '上传失败')
    if (error?.response?.status === 409 || msg.includes('已存在')) {
      uploadLoading.value = false
      try {
        await ElMessageBox.confirm(
          `检测到 ${query.dataset} / ${uploadForm.year}-${uploadForm.month} / ${uploadForm.varModel} 已存在数据。确定要覆盖更新原记录吗？`,
          '数据已存在',
          { type: 'warning', confirmButtonText: '确定覆盖', cancelButtonText: '取消' }
        )
        // 用户确认覆盖：查找已有记录 ID 自动执行手动更新
        const existingRow = rows.value.find(
          r => r.year === uploadForm.year && r.month === uploadForm.month && r.var_model === uploadForm.varModel
        )
        const content = await uploadForm.file.text()
        JSON.parse(content)
        if (existingRow?.id) {
          await updateForecastData(existingRow.id, {
            dataset: query.dataset,
            year: uploadForm.year,
            month: uploadForm.month,
            varModel: uploadForm.varModel,
            data: content,
          })
        } else {
          // 兜底方案
          await createForecastData({
            dataset: query.dataset,
            year: uploadForm.year,
            month: uploadForm.month,
            varModel: uploadForm.varModel,
            data: content,
          })
        }
        ElMessage.success('数据覆盖更新成功')
        uploadVisible.value = false
        await loadData()
      } catch (confirmErr: any) {
        if (confirmErr === 'cancel' || confirmErr === 'close') return
        ElMessage.error(errorMessage(confirmErr, '覆盖更新失败'))
      }
    } else {
      ElMessage.error(msg)
    }
  } finally {
    uploadLoading.value = false
  }
}

function openEcmwf() {
  ecmwfForm.year = query.year || new Date().getFullYear().toString()
  ecmwfForm.month = query.month || String(new Date().getMonth() + 1)
  ecmwfForm.varModel = query.varModel || modelOptions.value[0] || ''
  ecmwfForm.date = ''
  if (query.dataset === 'NAO') {
    ecmwfForm.param = 'msl'
  } else if (query.dataset === 'SIE') {
    ecmwfForm.param = 'ci'
  } else {
    ecmwfForm.param = 'skt'
  }
  ecmwfVisible.value = true
}

async function submitEcmwf(overwrite: boolean = false) {
  ecmwfLoading.value = true
  try {
    await importForecastFromEcmwf({
      dataset: query.dataset,
      year: ecmwfForm.year,
      month: ecmwfForm.month,
      varModel: ecmwfForm.varModel,
      date: ecmwfForm.date || undefined,
      time: ecmwfForm.time,
      step: ecmwfForm.step,
      param: ecmwfForm.param,
      levtype: ecmwfForm.levtype || undefined,
      levelist: ecmwfForm.levelist,
      stream: ecmwfForm.stream || undefined,
      type: ecmwfForm.type,
      source: ecmwfForm.source,
      model: ecmwfForm.model,
      overwrite: overwrite || undefined,
    })
    ElMessage.success(overwrite ? 'ECMWF 数据覆盖更新成功' : 'ECMWF 数据获取并发布成功')
    ecmwfVisible.value = false
    await loadData()
  } catch (error: any) {
    const msg = errorMessage(error, 'ECMWF 导入失败')
    if (!overwrite && (error?.response?.status === 409 || msg.includes('已存在'))) {
      ecmwfLoading.value = false
      try {
        await ElMessageBox.confirm(
          `检测到 ${query.dataset} / ${ecmwfForm.year}-${ecmwfForm.month} / ${ecmwfForm.varModel} 已存在数据。确定要覆盖更新原记录吗？`,
          '数据已存在',
          { type: 'warning', confirmButtonText: '确定覆盖', cancelButtonText: '取消' }
        )
        // 用户确认覆盖：重新调用 submitEcmwf(true)
        await submitEcmwf(true)
      } catch (confirmErr: any) {
        if (confirmErr === 'cancel' || confirmErr === 'close') return
        ElMessage.error(errorMessage(confirmErr, '覆盖更新失败'))
      }
    } else {
      ElMessage.error(msg)
    }
  } finally {
    ecmwfLoading.value = false
  }
}

const noaaLoading = ref(false)

async function submitNoaaIndex(overwrite: boolean = false) {
  const targetYear = query.year || new Date().getFullYear().toString()
  const targetMonth = query.month || String(new Date().getMonth() + 1)
  const targetVarModel = query.varModel || modelOptions.value[0] || ''

  if (!targetVarModel) {
    ElMessage.warning('请选择要拉取的 var_model')
    return
  }

  noaaLoading.value = true
  try {
    await importIndexFromNoaa({
      dataset: query.dataset,
      year: targetYear,
      month: targetMonth,
      varModel: targetVarModel,
      overwrite: overwrite || undefined,
    })
    ElMessage.success(overwrite ? 'NOAA Index 覆盖更新成功' : 'NOAA 官方 Index 自动获取成功')
    await loadData()
  } catch (error: any) {
    const msg = errorMessage(error, 'NOAA 导入失败')
    if (!overwrite && (error?.response?.status === 409 || msg.includes('已存在'))) {
      noaaLoading.value = false
      try {
        await ElMessageBox.confirm(
          `检测到 ${query.dataset} / ${targetYear}-${targetMonth} / ${targetVarModel} 已存在数据。确定要覆盖更新原记录吗？`,
          '数据已存在',
          { type: 'warning', confirmButtonText: '确定覆盖', cancelButtonText: '取消' }
        )
        await submitNoaaIndex(true)
      } catch (confirmErr: any) {
        if (confirmErr === 'cancel' || confirmErr === 'close') return
        ElMessage.error(errorMessage(confirmErr, '覆盖更新失败'))
      }
    } else {
      ElMessage.error(msg)
    }
  } finally {
    noaaLoading.value = false
  }
}

async function logout() {
  try {
    await adminLogout()
  } finally {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    await router.replace({ name: 'AdminLogin' })
  }
}

onMounted(async () => {
  try {
    await loadMeta()
    await loadData()
  } catch (error: any) {
    ElMessage.error(errorMessage(error, '初始化管理页面失败'))
  }
})
</script>

<template>
  <div class="admin-page">
    <div class="admin-header">
      <div>
        <h2>预报数据管理</h2>
        <p>功能 2.1–2.3：更新、删除、发布新的预报数据</p>
      </div>
      <el-button @click="logout">退出登录</el-button>
    </div>

    <el-card shadow="never" class="toolbar-card">
      <el-form :inline="true" label-position="top">
        <el-form-item label="数据集">
          <el-select v-model="query.dataset" style="width: 140px" @change="datasetChanged">
            <el-option v-for="item in datasets" :key="item.name" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="年份">
          <el-input v-model="query.year" clearable placeholder="如 2026" style="width: 120px" />
        </el-form-item>
        <el-form-item label="月份">
          <el-input v-model="query.month" clearable placeholder="1-12" style="width: 100px" />
        </el-form-item>
        <el-form-item label="var_model">
          <el-select v-model="query.varModel" clearable placeholder="全部" style="width: 210px">
            <el-option v-for="model in modelOptions" :key="model" :label="model" :value="model" />
          </el-select>
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="openUpload">手动上传并发布</el-button>
          <template v-if="query.dataset === 'NAO'">
            <el-button v-if="isEcmwfSupported" type="success" @click="openEcmwf">从 ECMWF 获取并发布</el-button>
            <el-button v-else type="warning" :loading="noaaLoading" @click="() => submitNoaaIndex()">从 NOAA 自动拉取 Index</el-button>
          </template>
          <el-tooltip
            v-else
            content="ENSO 及 SIE 数据集模型为外部 AI 算法预测产物，须使用【手动上传】"
            placement="top"
          >
            <span>
              <el-button disabled type="info">在线获取受限</el-button>
            </span>
          </el-tooltip>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="rows" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="year" label="年份" width="90" />
        <el-table-column prop="month" label="月份" width="80" />
        <el-table-column prop="var_model" label="var_model" min-width="180" />
        <el-table-column label="data 预览" min-width="360">
          <template #default="scope">
            <code class="data-preview">{{ dataPreview(scope.row) }}</code>
            <div class="data-length" v-if="scope.row.data_length">约 {{ scope.row.data_length }} 字符</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openEdit(scope.row)">手动更新</el-button>
            <el-button link type="danger" @click="removeRow(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          @current-change="loadData"
          @size-change="search"
        />
      </div>
    </el-card>

    <el-dialog v-model="editVisible" title="手动更新预报数据" width="760px">
      <el-form label-width="100px">
        <el-form-item label="年份"><el-input v-model="editForm.year" /></el-form-item>
        <el-form-item label="月份"><el-input v-model="editForm.month" /></el-form-item>
        <el-form-item label="var_model">
          <el-select v-model="editForm.varModel" style="width: 100%">
            <el-option v-for="model in modelOptions" :key="model" :label="model" :value="model" />
          </el-select>
        </el-form-item>
        <el-form-item label="data(JSON)">
          <el-input v-model="editForm.data" type="textarea" :rows="16" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">保存更新</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadVisible" title="手动上传并发布新预报数据" width="620px">
      <el-form label-width="100px">
        <el-form-item label="年份"><el-input v-model="uploadForm.year" /></el-form-item>
        <el-form-item label="月份"><el-input v-model="uploadForm.month" /></el-form-item>
        <el-form-item label="var_model">
          <el-select v-model="uploadForm.varModel" style="width: 100%">
            <el-option v-for="model in modelOptions" :key="model" :label="model" :value="model" />
          </el-select>
        </el-form-item>
        <el-form-item label="JSON 文件">
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept=".json,.txt,application/json,text/plain"
            :on-change="onUploadFileChange"
          >
            <el-button>选择文件</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploadLoading" @click="submitUpload">发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="ecmwfVisible" title="从 ECMWF Open Data 获取并发布" width="700px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="date 留空会自动选择最新可用起报；ECMWF Open Data 仅保留近期滚动数据。"
        class="dialog-alert"
      />
      <el-form label-width="120px">
        <el-form-item label="入库年份"><el-input v-model="ecmwfForm.year" /></el-form-item>
        <el-form-item label="入库月份"><el-input v-model="ecmwfForm.month" /></el-form-item>
        <el-form-item label="目标 var_model">
          <el-select v-model="ecmwfForm.varModel" style="width: 100%">
            <el-option v-for="model in modelOptions" :key="model" :label="model" :value="model" />
          </el-select>
        </el-form-item>
        <el-form-item label="ECMWF 日期">
          <el-input v-model="ecmwfForm.date" placeholder="可留空；或 20260722 / 2026-07-22" />
        </el-form-item>
        <el-form-item label="起报时间 UTC">
          <el-select v-model="ecmwfForm.time" style="width: 100%">
            <el-option v-for="t in [0, 6, 12, 18]" :key="t" :label="`${t.toString().padStart(2, '0')} UTC`" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="提前时效(h)"><el-input-number v-model="ecmwfForm.step" :min="0" :max="360" /></el-form-item>
        <el-form-item label="参数 param">
          <el-input v-model="ecmwfForm.param" placeholder="如 2t、msl；压力层可用 t/u/v/q 等" />
        </el-form-item>
        <el-form-item label="levtype">
          <el-select v-model="ecmwfForm.levtype" clearable placeholder="单层参数可留空" style="width: 100%">
            <el-option label="sfc" value="sfc" />
            <el-option label="pl" value="pl" />
          </el-select>
        </el-form-item>
        <el-form-item label="levelist">
          <el-input-number v-model="ecmwfForm.levelist" :min="1" :max="1100" placeholder="压力层如 500/850" />
        </el-form-item>
        <el-form-item label="数据源">
          <el-select v-model="ecmwfForm.source" style="width: 100%">
            <el-option label="ECMWF" value="ecmwf" />
            <el-option label="AWS 镜像" value="aws" />
            <el-option label="Google Cloud 镜像" value="google" />
            <el-option label="Azure 镜像" value="azure" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型">
          <el-select v-model="ecmwfForm.model" style="width: 100%">
            <el-option label="IFS" value="ifs" />
            <el-option label="AIFS single" value="aifs-single" />
            <el-option label="AIFS ensemble" value="aifs-ens" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ecmwfVisible = false">取消</el-button>
        <el-button type="success" :loading="ecmwfLoading" @click="() => submitEcmwf()">获取并发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  padding: 28px 40px 48px;
  background: #f4f6f8;
  box-sizing: border-box;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.admin-header h2 {
  margin: 0 0 6px;
  font-size: 28px;
}

.admin-header p {
  margin: 0;
  color: #606266;
}

.toolbar-card {
  margin-bottom: 18px;
}

.data-preview {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: #303133;
}

.data-length {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 18px;
}

.dialog-alert {
  margin-bottom: 18px;
}
</style>
