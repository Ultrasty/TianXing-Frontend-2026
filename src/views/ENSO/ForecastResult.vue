<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import VChart from 'vue-echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, Delete } from '@element-plus/icons-vue'
import bannerImg from '@/assets/enso1.jpg'
import { preloadImages, resolveImageUrl } from '@/utils/image'
import { requestErrorMessage } from '@/utils/requestError'

const chartNames = ['指数预测', '模态预测']
const chartSelected = ref(0)

const dateRanges = ref([
  { start: null, end: null },
  { start: null, end: null },
])
const selectedDates = ref([null, null])
const rangeLoading = ref([false, false])
const rangeErrors = ref(['', ''])
const dataLoading = ref([false, false])
const dataErrors = ref(['', ''])
const rangeRequestIds = [0, 0]
const requestIds = [0, 0]

const chart1 = ref({})
const chart1Description = ref('此处为预测结果指数预测折线图。')
const heatImages = ref([])
const heatTitles = ref([])
const heatIndex = ref(0)

const currentDate = computed({
  get: () => selectedDates.value[chartSelected.value],
  set: (value) => {
    selectedDates.value[chartSelected.value] = value
  },
})
const activeRange = computed(() => dateRanges.value[chartSelected.value])
const currentHeatImage = computed(() => resolveImageUrl(heatImages.value[heatIndex.value]))
const currentHeatTitle = computed(() => heatTitles.value[heatIndex.value] || '')
const hasIndexChart = computed(() => Object.keys(chart1.value || {}).length > 0)
const forecastPeriodLabel = computed(() => {
  const date = selectedDates.value[chartSelected.value]
  if (!date) return '当前预报结果'
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`
})

function parseYearMonth(value) {
  const match = /^(\d{4})-(\d{1,2})$/.exec(String(value || '').trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return new Date(year, month - 1, 1)
}

function monthNumber(date) {
  return date.getFullYear() * 12 + date.getMonth()
}

function isWithinRange(date, range) {
  if (!date || !range?.start || !range?.end) return false
  const value = monthNumber(date)
  return value >= monthNumber(range.start) && value <= monthNumber(range.end)
}

function limitedDateRange(time) {
  if (!activeRange.value?.start || !activeRange.value?.end) return false
  return !isWithinRange(time, activeRange.value)
}

async function loadRange(index) {
  const requestId = ++rangeRequestIds[index]
  const isIndexTab = index === 0
  rangeLoading.value[index] = true
  rangeErrors.value[index] = ''

  try {
    const response = await axios.get(
      isIndexTab
        ? '/enso/linechart/getInitData'
        : '/imgs/predictionResult/ssta/getInitData',
    )
    if (requestId !== rangeRequestIds[index]) return

    const start = parseYearMonth(
      isIndexTab ? response.data?.earliestDate : response.data?.start,
    )
    const end = parseYearMonth(
      isIndexTab ? response.data?.latestDate : response.data?.end,
    )

    if (!start || !end || monthNumber(start) > monthNumber(end)) {
      throw new Error('Invalid ENSO date range')
    }

    dateRanges.value[index] = { start, end }
    if (!isWithinRange(selectedDates.value[index], dateRanges.value[index])) {
      selectedDates.value[index] = new Date(end)
    }
  } catch (error) {
    if (requestId !== rangeRequestIds[index]) return
    dateRanges.value[index] = { start: null, end: null }
    rangeErrors.value[index] = requestErrorMessage(
      error,
      `${chartNames[index]}可选日期加载失败`,
    )
  } finally {
    if (requestId === rangeRequestIds[index]) {
      rangeLoading.value[index] = false
    }
  }
}

async function loadIndexChart() {
  const date = selectedDates.value[0]
  if (!date) return

  const requestId = ++requestIds[0]
  dataLoading.value[0] = true
  dataErrors.value[0] = ''
  chart1.value = {}

  try {
    const response = await axios.get('/enso/predictionResult/linechart', {
      params: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    })
    if (requestId !== requestIds[0]) return
    if (
      !response.data
      || typeof response.data !== 'object'
      || Object.keys(response.data).length === 0
    ) {
      throw new Error('Invalid ENSO index response')
    }
    chart1.value = response.data
  } catch (error) {
    if (requestId !== requestIds[0]) return
    dataErrors.value[0] = requestErrorMessage(error, 'ENSO 指数预测加载失败')
  } finally {
    if (requestId === requestIds[0]) dataLoading.value[0] = false
  }
}

async function loadModeImages() {
  const date = selectedDates.value[1]
  if (!date) return

  const requestId = ++requestIds[1]
  dataLoading.value[1] = true
  dataErrors.value[1] = ''
  heatImages.value = []
  heatTitles.value = []
  heatIndex.value = 0

  try {
    const response = await axios.get('/imgs/predictionResult/ssta', {
      params: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    })
    if (requestId !== requestIds[1]) return

    const images = Array.isArray(response.data?.data)
      ? response.data.data.filter((item) => typeof item === 'string' && item)
      : []
    if (images.length === 0) {
      throw new Error('Empty ENSO mode image list')
    }

    heatImages.value = images
    heatTitles.value = Array.isArray(response.data?.titles)
      ? response.data.titles
      : []
    preloadImages(images)
  } catch (error) {
    if (requestId !== requestIds[1]) return
    dataErrors.value[1] = requestErrorMessage(error, 'ENSO 模态预测加载失败')
  } finally {
    if (requestId === requestIds[1]) dataLoading.value[1] = false
  }
}

function loadActiveData() {
  return chartSelected.value === 0 ? loadIndexChart() : loadModeImages()
}

function currentEnsoModeType() {
  const title = currentHeatTitle.value
  if (title.includes('ENSO_MC')) return 'ENSO_MC'
  if (title.includes('ENSO_GTC')) return 'ENSO_GTC'
  return 'ENSO_ASC'
}

async function deleteForecastResult() {
  const date = selectedDates.value[1]
  if (!date) return

  try {
    await ElMessageBox.confirm(
      `确认删除 ${forecastPeriodLabel.value} 的预报结果图吗？删除后将无法恢复。`,
      '删除预报结果图',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        draggable: true,
      },
    )

    const payload = {
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1),
      day: null,
      type: currentEnsoModeType(),
      imagePath: heatImages.value[heatIndex.value],
    }

    const { data } = await axios.post('/admin/forecast-result-images/delete-image', payload)
    ElMessage.success(data?.message || '预报结果图删除成功')
    await loadModeImages()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除预报结果图失败', error)
      ElMessage.error(error?.response?.data?.message || '删除预报结果图失败')
    }
  }
}

async function selectChart(index) {
  chartSelected.value = index
  if (!activeRange.value?.start) {
    await loadRange(index)
  }

  if (index === 0 && !hasIndexChart.value) {
    await loadIndexChart()
  } else if (index === 1 && heatImages.value.length === 0) {
    await loadModeImages()
  }
}

function handleDateChange() {
  document.activeElement?.blur()
  loadActiveData()
}

async function retryRange() {
  await loadRange(chartSelected.value)
  if (activeRange.value?.start) await loadActiveData()
}

function changeHeatIndex(direction) {
  const total = heatImages.value.length
  if (total < 2) return

  heatIndex.value = direction === 'left'
    ? (heatIndex.value - 1 + total) % total
    : (heatIndex.value + 1) % total
}

const moveBoxLeft = computed(() => chartSelected.value * 250)
const movBoxStyle = computed(() => ({
  left: `${moveBoxLeft.value}px`,
}))

onMounted(async () => {
  await Promise.all([loadRange(0), loadRange(1)])
  if (dateRanges.value[0].start) await loadIndexChart()
})
</script>

<template>
  <div class="page-content">
    <div class="banner">
      <img :src="bannerImg" alt="">
      <h3 class="page-title">ENSO预测结果</h3>
    </div>

    <div class="menu-container">
      <ul class="menu">
        <div :style="movBoxStyle" class="mov-box"></div>
        <li
          v-for="(chartName, index) in chartNames"
          :key="chartName"
          :class="{ 'chart-name-selected': chartSelected === index }"
          @click="selectChart(index)"
        >
          <p>{{ chartName }}</p>
        </li>
      </ul>
    </div>

    <section class="content-shell">
      <div class="date-picker-container">
        <el-date-picker
          v-model="currentDate"
          type="month"
          :clearable="false"
          :disabled="rangeLoading[chartSelected] || !activeRange.start"
          :disabled-date="limitedDateRange"
          @change="handleDateChange"
        />
      </div>

      <div v-if="chartSelected === 1" class="result-actions">
        <el-button type="danger" plain :icon="Delete" class="delete-btn" @click="deleteForecastResult">
          删除预报结果图
        </el-button>
      </div>

      <div v-if="rangeErrors[chartSelected]" class="state-panel">
        <el-alert :title="rangeErrors[chartSelected]" type="error" :closable="false" show-icon />
        <el-button type="primary" plain @click="retryRange">重试日期加载</el-button>
      </div>

      <div v-if="chartSelected === 0" class="description">
        {{ chart1Description }}
      </div>
    </section>

    <section
      v-if="chartSelected === 0"
      class="chart-selector"
      :class="{ 'has-state': Boolean(dataErrors[0]) }"
      v-loading="dataLoading[0]"
    >
      <div v-if="dataErrors[0]" class="state-panel">
        <el-alert :title="dataErrors[0]" type="error" :closable="false" show-icon />
        <el-button type="primary" plain @click="loadIndexChart">重新加载</el-button>
      </div>
      <v-chart v-else-if="hasIndexChart" class="chart" :option="chart1" autoresize />
      <el-empty v-else-if="!dataLoading[0]" description="暂无指数预测数据" />
    </section>

    <section
      v-else
      class="chart-selector"
      :class="{ 'has-state': Boolean(dataErrors[1]) }"
      v-loading="dataLoading[1]"
    >
      <div v-if="dataErrors[1]" class="state-panel">
        <el-alert :title="dataErrors[1]" type="error" :closable="false" show-icon />
        <el-button type="primary" plain @click="loadModeImages">重新加载</el-button>
      </div>
      <div v-else-if="heatImages.length" class="picture-container">
        <p class="picture-title">{{ currentHeatTitle }}</p>
        <p class="picture-count">{{ heatIndex + 1 }}/{{ heatImages.length }}</p>
        <img :src="currentHeatImage" alt="ENSO 模态预测图">
        <template v-if="heatImages.length > 1">
          <el-button
            type="primary"
            class="arrow-left"
            :icon="ArrowLeft"
            aria-label="上一张"
            @click="changeHeatIndex('left')"
          />
          <el-button
            type="primary"
            class="arrow-right"
            :icon="ArrowRight"
            aria-label="下一张"
            @click="changeHeatIndex('right')"
          />
        </template>
      </div>
      <el-empty v-else-if="!dataLoading[1]" description="暂无模态预测图片" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.page-content {
  min-height: 100%;
}

.banner {
  position: relative;
  height: 420px;
  display: flex;
  align-items: center;
}

.banner img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% -190px;
}

.page-title {
  position: relative;
  z-index: 1;
  margin-left: 20%;
  color: rgb(251, 236, 222);
  font-family: 'STXinwei';
  font-size: 55px;
  font-weight: 300;
}

.menu-container {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  height: 85px;
  margin-top: -50px;
}

.menu {
  position: relative;
  display: flex;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  background: white;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
}

.menu li {
  display: flex;
  width: 250px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 17px;
}

.chart-name-selected {
  color: rgb(30, 158, 179);
}

.mov-box {
  position: absolute;
  bottom: 0;
  width: 125px;
  height: 2px;
  transform: translateX(50%);
  background: rgb(143, 178, 201);
  transition: left 0.3s ease;
}

.content-shell,
.chart-selector {
  margin: 0 10%;
}

.date-picker-container {
  display: flex;
  justify-content: flex-end;
  padding: 50px 0 18px;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}

.delete-btn {
  box-shadow: 0 8px 18px rgba(220, 38, 38, 0.12);
}

.description {
  padding: 16px;
  text-align: center;
  font-size: 17px;
  background: rgba(239, 242, 252, 0.8);
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
}

.chart-selector {
  min-height: 430px;
  margin-top: 28px;
  margin-bottom: 40px;
}

.chart-selector.has-state {
  min-height: 260px;
}

.chart {
  height: 50vh;
  min-height: 430px;
  padding: 20px 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
}

.picture-container {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 500px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px clamp(88px, 12%, 160px);
  overflow: hidden;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
}

.picture-container img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.picture-title {
  margin: 0 0 6px;
  font-size: 18px;
}

.picture-count {
  margin: 0 0 12px;
  color: #606266;
}

.arrow-left,
.arrow-right {
  position: absolute;
  top: 0;
}

.arrow-left {
  left: 0;
}

.arrow-right {
  right: 0;
}

.state-panel {
  display: flex;
  width: min(560px, calc(100% - 48px));
  margin: 0 auto;
  padding: 28px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  background: rgba(250, 250, 250, 0.82);
  border: 1px solid #ebeef5;
  border-radius: 10px;
}

.state-panel :deep(.el-button) {
  position: static;
  width: auto;
  min-width: 112px;
  height: 38px;
  align-self: center;
  padding: 8px 20px;
  font-size: 14px;
  border-radius: 6px;
}

@media (max-width: 760px) {
  .menu li {
    width: 45vw;
  }

  .page-title {
    margin-left: 8%;
    font-size: 42px;
  }

  .content-shell,
  .chart-selector {
    margin-right: 4%;
    margin-left: 4%;
  }

  .picture-container {
    padding-right: 56px;
    padding-left: 56px;
  }
}
</style>
