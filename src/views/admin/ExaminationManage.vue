<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type UploadFile } from 'element-plus'
import { Back, Delete, Edit, Plus, Refresh, Upload, Connection, SwitchButton } from '@element-plus/icons-vue'
import {
  createEvaluation,
  deleteEvaluation,
  evaluateWithNsidc,
  getAdminApiError,
  getEvaluationMetadata,
  getEvaluations,
  importEvaluationFile,
  updateEvaluation,
  type EvaluationCategory,
  type EvaluationMetadata,
  type EvaluationPayload,
  type EvaluationRecord,
  type ImportMode,
  type NsidcEvaluationResult,
} from '@/api/admin'
import { clearAdminSession } from '@/utils/adminAuth'

const router = useRouter()
const categories: EvaluationCategory[] = ['ENSO', 'NAO', 'SIC', 'SIE']
const categoryDescriptions: Record<EvaluationCategory, string> = {
  ENSO: 'ENSO 观测评估序列',
  NAO: 'NAO 1–6 个月领先相关系数',
  SIC: '海冰密集度误差与技巧指标',
  SIE: '海冰范围误差分解指标',
}

const metadata = ref<EvaluationMetadata | null>(null)
const activeCategory = ref<EvaluationCategory>('ENSO')
const loading = ref(false)
const saving = ref(false)
const rows = ref<EvaluationRecord[]>([])
const total = ref(0)
const pagination = reactive({ page: 1, pageSize: 20 })
const filters = reactive({ year: '', month: '', day: '', varModel: '' })

const editorVisible = ref(false)
const editing = ref(false)
const form = reactive({
  id: 0,
  category: 'ENSO' as EvaluationCategory,
  year: '',
  month: '',
  day: '',
  varModel: '',
  data: '[\n  \n]',
})

const importVisible = ref(false)
const importMode = ref<ImportMode>('REJECT')
const importFile = ref<File | null>(null)
const importing = ref(false)

const nsidcVisible = ref(false)
const nsidcLoading = ref(false)
const nsidcResult = ref<NsidcEvaluationResult | null>(null)
const nsidc = reactive({
  category: 'SIC' as 'SIC' | 'SIE',
  year: '2023',
  month: '4',
  day: '22',
  leadStartOffsetDays: 0 as 0 | 1,
})

const currentMetadata = computed(() => metadata.value?.categories[activeCategory.value])
const editorMetadata = computed(() => metadata.value?.categories[form.category])
function hasField(category: EvaluationCategory, field: string) {
  const fallback: Record<EvaluationCategory, string[]> = {
    ENSO: ['year', 'data'],
    NAO: ['year', 'month', 'varModel', 'data'],
    SIC: ['year', 'month', 'day', 'varModel', 'data'],
    SIE: ['year', 'month', 'varModel', 'data'],
  }
  return (metadata.value?.categories[category]?.requiredFields || fallback[category]).includes(field)
}

function varModels(category: EvaluationCategory, year: string) {
  const models = metadata.value?.categories[category]?.allowedVarModels || []
  return [...new Set(models.map((model) => model.replace('{year}', /^\d{4}$/.test(year) ? year : '{year}')))]
}

function normalizeFields(target: { category: EvaluationCategory; year: string; month: string; day: string; varModel: string }) {
  if (target.category === 'NAO') {
    target.year = 'all'
    target.month = 'all'
    target.day = ''
  } else if (target.category === 'ENSO') {
    target.month = ''
    target.day = ''
    target.varModel = ''
  } else if (target.category === 'SIE') {
    target.day = ''
  }
  const options = varModels(target.category, target.year).filter((value) => !value.includes('{year}'))
  if (hasField(target.category, 'varModel') && !options.includes(target.varModel)) {
    target.varModel = options[0] || ''
  }
}

async function loadData() {
  loading.value = true
  try {
    const result = await getEvaluations({
      category: activeCategory.value,
      year: filters.year || undefined,
      month: hasField(activeCategory.value, 'month') ? filters.month || undefined : undefined,
      day: hasField(activeCategory.value, 'day') ? filters.day || undefined : undefined,
      varModel: hasField(activeCategory.value, 'varModel') ? filters.varModel || undefined : undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    rows.value = result.items
    total.value = result.total
  } catch (error) {
    ElMessage.error(getAdminApiError(error, '加载评估数据失败'))
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, { year: '', month: '', day: '', varModel: '' })
  pagination.page = 1
  loadData()
}

function openCreate() {
  editing.value = false
  Object.assign(form, {
    id: 0,
    category: activeCategory.value,
    year: activeCategory.value === 'NAO' ? 'all' : String(new Date().getFullYear()),
    month: activeCategory.value === 'NAO' ? 'all' : '',
    day: '',
    varModel: '',
    data: '[\n  \n]',
  })
  normalizeFields(form)
  editorVisible.value = true
}

function openEdit(row: EvaluationRecord) {
  editing.value = true
  Object.assign(form, {
    id: row.id,
    category: row.category,
    year: row.year,
    month: row.month || '',
    day: row.day || '',
    varModel: row.varModel || '',
    data: JSON.stringify(row.data, null, 2),
  })
  editorVisible.value = true
}

function validateArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) return false
  const valid = (node: unknown): boolean => {
    if (node === null || node === undefined) return false
    if (typeof node === 'number') return Number.isFinite(node)
    if (typeof node === 'string') return node.trim() !== '' && !['nan', 'infinity', '+infinity', '-infinity'].includes(node.toLowerCase())
    if (Array.isArray(node)) return node.every(valid)
    if (typeof node === 'object') return Object.values(node as Record<string, unknown>).every(valid)
    return true
  }
  return value.every(valid)
}

function buildPayload(): EvaluationPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(form.data)
  } catch {
    throw new Error('评估数据必须是合法 JSON')
  }
  if (!validateArray(parsed)) {
    throw new Error('评估数据必须是不含空值的非空 JSON 数组')
  }
  if (!form.year.trim()) throw new Error('请填写年份')
  if (hasField(form.category, 'month') && !form.month.trim()) throw new Error('请填写月份')
  if (hasField(form.category, 'day') && !form.day.trim()) throw new Error('请填写日期')
  if (hasField(form.category, 'varModel') && !form.varModel.trim()) throw new Error('请选择评估指标')
  return {
    year: form.year.trim(),
    month: hasField(form.category, 'month') ? form.month.trim() : undefined,
    day: hasField(form.category, 'day') ? form.day.trim() : undefined,
    varModel: hasField(form.category, 'varModel') ? form.varModel.trim() : undefined,
    data: parsed,
    source: 'MANUAL',
  }
}

async function saveRecord() {
  saving.value = true
  try {
    const payload = buildPayload()
    if (editing.value) {
      await updateEvaluation(form.category, form.id, payload)
      ElMessage.success('评估数据已更新')
    } else {
      await createEvaluation({ ...payload, category: form.category })
      ElMessage.success('评估数据已发布')
    }
    editorVisible.value = false
    await loadData()
  } catch (error) {
    ElMessage.error(getAdminApiError(error, error instanceof Error ? error.message : '保存失败'))
  } finally {
    saving.value = false
  }
}

async function removeRecord(row: EvaluationRecord) {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${row.category} #${row.id} 评估数据？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    await deleteEvaluation(row.category, row.id)
    ElMessage.success('删除成功')
    if (rows.value.length === 1 && pagination.page > 1) pagination.page -= 1
    await loadData()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(getAdminApiError(error, '删除失败'))
  }
}

function selectImportFile(file: UploadFile) {
  importFile.value = file.raw || null
}

async function uploadImport() {
  if (!importFile.value) {
    ElMessage.warning('请选择 JSON 文件')
    return
  }
  importing.value = true
  try {
    const result = await importEvaluationFile(activeCategory.value, importMode.value, importFile.value)
    ElMessage.success(`导入完成：新增 ${result.inserted} 条，更新 ${result.updated} 条`)
    importVisible.value = false
    importFile.value = null
    await loadData()
  } catch (error) {
    ElMessage.error(getAdminApiError(error, '文件导入失败'))
  } finally {
    importing.value = false
  }
}

function openNsidc() {
  nsidc.category = activeCategory.value === 'SIE' ? 'SIE' : 'SIC'
  if (nsidc.category === 'SIE') nsidc.year = '2022'
  nsidcResult.value = null
  nsidcVisible.value = true
}

async function runNsidc(mode: 'PREVIEW' | 'UPSERT') {
  if (!/^\d{4}$/.test(nsidc.year)) {
    ElMessage.warning('年份必须是四位数字')
    return
  }
  if (nsidc.category === 'SIC' && (!nsidc.month || !nsidc.day)) {
    ElMessage.warning('SIC 评估必须填写起报月和日')
    return
  }
  nsidcLoading.value = true
  try {
    nsidcResult.value = await evaluateWithNsidc({
      category: nsidc.category,
      year: nsidc.year,
      month: nsidc.category === 'SIC' ? nsidc.month : undefined,
      day: nsidc.category === 'SIC' ? nsidc.day : undefined,
      leadStartOffsetDays: nsidc.category === 'SIC' ? nsidc.leadStartOffsetDays : undefined,
      mode,
    })
    if (mode === 'UPSERT') {
      const publication = nsidcResult.value.publication
      ElMessage.success(`真实指标已发布：新增 ${publication?.inserted || 0} 条，更新 ${publication?.updated || 0} 条`)
      activeCategory.value = nsidc.category
      await loadData()
    } else {
      ElMessage.success('NSIDC 真实指标计算完成，尚未写入数据库')
    }
  } catch (error) {
    ElMessage.error(getAdminApiError(error, 'NSIDC 指标计算失败'))
  } finally {
    nsidcLoading.value = false
  }
}

function formatData(value: unknown) {
  const json = JSON.stringify(value)
  return json.length > 100 ? `${json.slice(0, 100)}…` : json
}

function logout() {
  clearAdminSession()
  router.replace({ name: 'AdminLogin' })
}

watch(activeCategory, () => {
  Object.assign(filters, { year: '', month: '', day: '', varModel: '' })
  pagination.page = 1
  loadData()
})

watch(() => form.category, () => normalizeFields(form))
watch(() => form.year, () => normalizeFields(form))
onMounted(async () => {
  try {
    metadata.value = await getEvaluationMetadata()
    normalizeFields(form)
    await loadData()
  } catch (error) {
    ElMessage.error(getAdminApiError(error, '加载管理端元数据失败'))
  }
})
</script>

<template>
  <main class="admin-page">
    <header class="admin-header">
      <div>
        <p class="eyebrow">天行平台·管理端</p>
        <h1>预报评估数据管理</h1>
        <p>功能 2.7–2.9：更新、删除和发布评估数据</p>
      </div>
      <div class="header-actions">
        <el-button type="primary">📊 预报评估数据库</el-button>
        <el-button @click="router.push('/admin/forecast-result-images/publish')">🖼️ 结果图发布</el-button>
        <el-button :icon="Back" @click="router.push({ name: 'home' })">公开站点</el-button>
        <el-button :icon="SwitchButton" @click="logout">退出登录</el-button>
      </div>
    </header>

    <section class="panel category-panel">
      <el-tabs v-model="activeCategory" class="category-tabs">
        <el-tab-pane v-for="category in categories" :key="category" :label="category" :name="category" />
      </el-tabs>
      <p>{{ categoryDescriptions[activeCategory] }}</p>
      <small v-if="currentMetadata">自然键：{{ currentMetadata.naturalKey }}</small>
    </section>

    <section class="panel toolbar">
      <div class="filters">
        <el-input v-if="activeCategory !== 'NAO'" v-model="filters.year" placeholder="年份" clearable />
        <el-input v-if="hasField(activeCategory, 'month') && activeCategory !== 'NAO'" v-model="filters.month" placeholder="月份" clearable />
        <el-input v-if="hasField(activeCategory, 'day')" v-model="filters.day" placeholder="日" clearable />
        <el-select v-if="hasField(activeCategory, 'varModel')" v-model="filters.varModel" placeholder="全部指标" clearable filterable>
          <el-option v-for="model in varModels(activeCategory, filters.year)" :key="model" :label="model" :value="model" />
        </el-select>
        <el-button type="primary" :icon="Refresh" @click="pagination.page = 1; loadData()">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
      <div class="operations">
        <el-button :icon="Upload" @click="importVisible = true">导入 JSON</el-button>
        <el-button type="warning" plain :icon="Connection" @click="openNsidc">NSIDC 科学评估</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">发布数据</el-button>
      </div>
    </section>

    <section class="panel table-panel">
      <el-table :data="rows" v-loading="loading" row-key="id" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="category" label="类别" width="90">
          <template #default="{ row }"><el-tag>{{ row.category }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="year" label="年份" width="100" />
        <el-table-column v-if="hasField(activeCategory, 'month')" prop="month" label="月份" width="90" />
        <el-table-column v-if="hasField(activeCategory, 'day')" prop="day" label="日" width="80" />
        <el-table-column v-if="hasField(activeCategory, 'varModel')" prop="varModel" label="评估指标" min-width="220" />
        <el-table-column label="数据预览" min-width="260">
          <template #default="{ row }"><code>{{ formatData(row.data) }}</code></template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row as EvaluationRecord)">更新</el-button>
            <el-button link type="danger" :icon="Delete" @click="removeRecord(row as EvaluationRecord)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无评估数据" /></template>
      </el-table>
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadData"
        @size-change="pagination.page = 1; loadData()"
      />
    </section>

    <el-dialog v-model="editorVisible" :title="editing ? '更新评估数据（2.7）' : '发布评估数据（2.9）'" width="680px">
      <el-form label-position="top">
        <el-form-item label="评估类别">
          <el-select v-model="form.category" :disabled="editing">
            <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
          </el-select>
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="年份">
            <el-input v-model="form.year" :disabled="form.category === 'NAO'" placeholder="如 2026" />
          </el-form-item>
          <el-form-item v-if="hasField(form.category, 'month')" label="月份">
            <el-input v-model="form.month" :disabled="form.category === 'NAO'" placeholder="1–12" />
          </el-form-item>
          <el-form-item v-if="hasField(form.category, 'day')" label="日">
            <el-input v-model="form.day" placeholder="1–31" />
          </el-form-item>
          <el-form-item v-if="hasField(form.category, 'varModel')" label="评估指标">
            <el-select v-model="form.varModel" filterable>
              <el-option v-for="model in varModels(form.category, form.year)" :key="model" :label="model" :value="model" :disabled="model.includes('{year}')" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="评估数据（非空 JSON 数组）">
          <el-input v-model="form.data" type="textarea" :rows="10" placeholder="[0.12, 0.18, 0.21]" />
        </el-form-item>
        <el-alert v-if="editorMetadata" :closable="false" type="info" show-icon :title="`数据表：${editorMetadata.table}；自然键：${editorMetadata.naturalKey}`" />
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRecord">{{ editing ? '保存更新' : '确认发布' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-if="nsidcVisible"
      key="nsidc-dialog"
      v-model="nsidcVisible"
      title="NSIDC 真实 SIC / SIE 指标计算"
      width="860px"
      destroy-on-close
    >
      <el-alert
        type="success"
        :closable="false"
        show-icon
        title="预测值来自现有 Ice-BCNet / IceTFT；观测值实时取自 NSIDC 官方产品，结果保留版本、URL 与 SHA-256。"
      />
      <el-form class="evaluation-form" label-position="top">
        <div class="form-grid three">
          <el-form-item label="评估类别">
            <el-radio-group v-model="nsidc.category" @change="nsidcResult = null">
              <el-radio-button value="SIC">SIC</el-radio-button>
              <el-radio-button value="SIE">SIE</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="nsidc.category === 'SIC' ? '起报年份' : '起报样本年份'">
            <el-input v-model="nsidc.year" placeholder="2023" />
          </el-form-item>
          <template v-if="nsidc.category === 'SIC'">
            <el-form-item label="起报月份"><el-input v-model="nsidc.month" placeholder="4" /></el-form-item>
            <el-form-item label="起报日"><el-input v-model="nsidc.day" placeholder="22" /></el-form-item>
            <el-form-item label="数组第 1 帧对应日期">
              <el-select v-model="nsidc.leadStartOffsetDays">
                <el-option label="起报当天（推荐）" :value="0" />
                <el-option label="起报次日" :value="1" />
              </el-select>
            </el-form-item>
          </template>
        </div>
        <el-alert
          type="info"
          :closable="false"
          :title="nsidc.category === 'SIC'
            ? 'SIC：下载 MASAM2 V2 月文件并缓存，重网格到 384×420 模型网格，计算逐提前 1–7 天 RMSE/BACC。首次下载约需 1–5 分钟。'
            : 'SIE：以该年全部月起报为样本，对提前 1–12 月计算 RMSD、偏差平方、误差方差、相关系数和标准差。'"
        />
        <template v-if="nsidcResult">
          <el-divider content-position="left">可追溯计算结果</el-divider>
          <p class="metadata-line">
            预测：{{ nsidcResult.predictionModel }} · 观测：{{ nsidcResult.observation.datasetId }}
            V{{ nsidcResult.observation.version }} · DOI：{{ nsidcResult.observation.doi || '—' }} ·
            状态：{{ nsidcResult.published ? '已发布' : '仅预览' }}
          </p>
          <el-table :data="nsidcResult.records" size="small" border>
            <el-table-column prop="varModel" label="指标" width="150" />
            <el-table-column label="结果数组">
              <template #default="{ row }"><code>{{ JSON.stringify(row.data) }}</code></template>
            </el-table-column>
          </el-table>
          <el-collapse class="nsidc-details">
            <el-collapse-item title="查看匹配规则、诊断与文件校验信息" name="details">
              <el-input
                :model-value="JSON.stringify({ matching: nsidcResult.matching, metricDefinitions: nsidcResult.metricDefinitions, diagnostics: nsidcResult.diagnostics, observation: nsidcResult.observation }, null, 2)"
                type="textarea"
                :rows="12"
                readonly
              />
            </el-collapse-item>
          </el-collapse>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="nsidcVisible = false">关闭</el-button>
        <el-button :loading="nsidcLoading" @click="runNsidc('PREVIEW')">只计算预览</el-button>
        <el-button type="primary" :loading="nsidcLoading" @click="runNsidc('UPSERT')">计算并发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" :title="`${activeCategory} JSON 文件导入`" width="560px">
      <el-form label-position="top">
        <el-form-item label="重复数据策略">
          <el-radio-group v-model="importMode">
            <el-radio-button value="REJECT">REJECT：有重复则整批拒绝</el-radio-button>
            <el-radio-button value="UPSERT">UPSERT：覆盖已有记录</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="JSON 文件">
          <el-upload accept="application/json,.json" :auto-upload="false" :limit="1" :on-change="selectImportFile">
            <el-button :icon="Upload">选择文件</el-button>
          </el-upload>
        </el-form-item>
        <el-alert :closable="false" type="info" title="文件需包含 category 和 records 数组，且 category 必须与当前页签一致。" />
      </el-form>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="uploadImport">开始导入</el-button>
      </template>
    </el-dialog>

  </main>
</template>

<style scoped lang="scss">
.admin-page { min-height: 100vh; padding: 28px; background: #eef3f8; color: #16324a; }
.admin-header { max-width: 1500px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.admin-header h1 { margin: 3px 0 8px; font-size: 30px; }
.admin-header p { margin: 0; color: #657b8d; }
.eyebrow { color: #1460a8 !important; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.header-actions, .operations, .filters { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.panel { max-width: 1500px; margin: 0 auto 16px; padding: 20px 24px; background: white; border: 1px solid #dde7ef; border-radius: 14px; box-shadow: 0 8px 28px rgba(25, 62, 89, .06); }
.category-panel { padding-bottom: 16px; }
.category-panel p { margin: 2px 0 6px; color: #36576f; }
.category-panel small { color: #8396a5; }
.category-tabs :deep(.el-tabs__header) { margin-bottom: 10px; }
.toolbar { display: flex; justify-content: space-between; gap: 18px; }
.filters :deep(.el-input), .filters :deep(.el-select) { width: 145px; }
.table-panel { overflow: hidden; }
.table-panel :deep(.el-pagination) { justify-content: flex-end; margin-top: 20px; }
code { color: #34536a; font-family: Consolas, monospace; white-space: normal; overflow-wrap: anywhere; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
.form-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.form-grid :deep(.el-select), .form-grid :deep(.el-input-number) { width: 100%; }
.evaluation-form { margin-top: 20px; }
.metadata-line { color: #657b8d; font-size: 13px; }
.nsidc-details { margin-top: 16px; }
@media (max-width: 900px) {
  .admin-page { padding: 16px; }
  .admin-header, .toolbar { align-items: flex-start; flex-direction: column; }
  .form-grid, .form-grid.three { grid-template-columns: 1fr; }
  .filters :deep(.el-input), .filters :deep(.el-select) { width: 100%; }
}
</style>
