<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import VChart from 'vue-echarts'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import bannerImg from '@/assets/enso1.jpg'
import { requestErrorMessage } from '@/utils/requestError'

const chartNames = ['逐月比对', '预报误差', '误差分析', '相关系数']
const chartSelected = ref(0)
const descriptions = ref([
  '此处为预测结果汇总折线图。',
  '此处展示所选起报月份的预测结果、官方记录及二者绝对差值。',
  '此处为不同起报月份的绝对差值分布箱型图。',
  '此处为不同起报月份的相关性折线图。',
])

const dateRanges = ref([
  { start: null, end: null },
  { start: null, end: null },
  { start: null, end: null },
  { start: null, end: null },
])
const selectedDates = ref([null, null, null, null])
const rangeLoading = ref([false, false, false, false])
const rangeErrors = ref(['', '', '', ''])
const dataLoading = ref([false, false, false, false])
const dataErrors = ref(['', '', '', ''])
const rangeRequestIds = [0, 0, 0, 0]
const requestIds = [0, 0, 0, 0]

const chartOptions = ref([{}, {}, {}, {}])
const errorOptions = ref([])
const errorIndex = ref(0)

const currentDate = computed({
  get: () => selectedDates.value[chartSelected.value],
  set: (value) => {
    selectedDates.value[chartSelected.value] = value
  },
})
const activeRange = computed(() => dateRanges.value[chartSelected.value])
const activeOption = computed(() => (
  chartSelected.value === 1
    ? errorOptions.value[errorIndex.value] || {}
    : chartOptions.value[chartSelected.value] || {}
))
const hasActiveData = computed(() => Object.keys(activeOption.value || {}).length > 0)

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

function applyRange(indices, startValue, endValue) {
  const start = parseYearMonth(startValue)
  const end = parseYearMonth(endValue)
  if (!start || !end || monthNumber(start) > monthNumber(end)) {
    throw new Error('Invalid ENSO examination date range')
  }

  indices.forEach((index) => {
    dateRanges.value[index] = { start, end }
    const current = selectedDates.value[index]
    const currentValue = current ? monthNumber(current) : null
    if (
      currentValue === null
      || currentValue < monthNumber(start)
      || currentValue > monthNumber(end)
    ) {
      selectedDates.value[index] = new Date(end)
    }
  })
}

async function loadRange(indices, endpoint, startKey, endKey) {
  const requestVersions = new Map(
    indices.map((index) => [index, ++rangeRequestIds[index]]),
  )
  const isCurrent = () => indices.every(
    (index) => requestVersions.get(index) === rangeRequestIds[index],
  )

  indices.forEach((index) => {
    rangeLoading.value[index] = true
    rangeErrors.value[index] = ''
  })

  try {
    const response = await axios.get(endpoint)
    if (!isCurrent()) return
    applyRange(indices, response.data?.[startKey], response.data?.[endKey])
  } catch (error) {
    if (!isCurrent()) return
    indices.forEach((index) => {
      dateRanges.value[index] = { start: null, end: null }
      rangeErrors.value[index] = requestErrorMessage(
        error,
        `${chartNames[index]}可选日期加载失败`,
      )
    })
  } finally {
    if (isCurrent()) {
      indices.forEach((index) => {
        rangeLoading.value[index] = false
      })
    }
  }
}

function loadAllRanges() {
  return Promise.all([
    loadRange(
      [0, 1],
      '/enso/monthlyComparison/getInitData',
      'start',
      'end',
    ),
    loadRange(
      [2],
      '/enso/errorBox/getInitData',
      'earliestDate',
      'latestDate',
    ),
    loadRange(
      [3],
      '/enso/errorCorr/getInitData',
      'earliestDate',
      'latestDate',
    ),
  ])
}

function limitedDateRange(time) {
  const range = activeRange.value
  if (!range?.start || !range?.end) return false
  const value = monthNumber(time)
  return value < monthNumber(range.start) || value > monthNumber(range.end)
}

function endpointFor(index) {
  return [
    '/enso/predictionExamination/monthlyComparison',
    '/enso/predictionExamination/error',
    '/enso/predictionExamination/errorBox',
    '/enso/predictionExamination/errorCorr',
  ][index]
}

async function loadChart(index = chartSelected.value) {
  const date = selectedDates.value[index]
  if (!date) return

  const requestId = ++requestIds[index]
  dataLoading.value[index] = true
  dataErrors.value[index] = ''
  if (index === 1) {
    errorOptions.value = []
    errorIndex.value = 0
  } else {
    chartOptions.value[index] = {}
  }

  try {
    const response = await axios.get(endpointFor(index), {
      params: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    })
    if (requestId !== requestIds[index]) return

    if (index === 1) {
      const options = Array.isArray(response.data?.option)
        ? response.data.option.filter((item) => item && typeof item === 'object')
        : []
      if (options.length === 0) throw new Error('Empty ENSO error chart list')
      errorOptions.value = options
      errorIndex.value = 0
    } else {
      const option = response.data?.option
      if (
        !option
        || typeof option !== 'object'
        || Object.keys(option).length === 0
      ) {
        throw new Error('Invalid ENSO examination chart')
      }
      chartOptions.value[index] = option
    }

    if (typeof response.data?.text === 'string' && response.data.text.trim()) {
      descriptions.value[index] = response.data.text
    }
  } catch (error) {
    if (requestId !== requestIds[index]) return
    dataErrors.value[index] = requestErrorMessage(
      error,
      `${chartNames[index]}数据加载失败`,
    )
  } finally {
    if (requestId === requestIds[index]) dataLoading.value[index] = false
  }
}

async function selectChart(index) {
  chartSelected.value = index
  if (!activeRange.value?.start) return

  const hasData = index === 1
    ? errorOptions.value.length > 0
    : Object.keys(chartOptions.value[index] || {}).length > 0
  if (!hasData) await loadChart(index)
}

function handleDateChange() {
  document.activeElement?.blur()
  loadChart()
}

async function retryRange() {
  if (chartSelected.value <= 1) {
    await loadRange(
      [0, 1],
      '/enso/monthlyComparison/getInitData',
      'start',
      'end',
    )
  } else if (chartSelected.value === 2) {
    await loadRange(
      [2],
      '/enso/errorBox/getInitData',
      'earliestDate',
      'latestDate',
    )
  } else {
    await loadRange(
      [3],
      '/enso/errorCorr/getInitData',
      'earliestDate',
      'latestDate',
    )
  }

  if (activeRange.value?.start) await loadChart()
}

function changeErrorChart(direction) {
  const total = errorOptions.value.length
  if (total < 2) return
  errorIndex.value = direction === 'left'
    ? (errorIndex.value - 1 + total) % total
    : (errorIndex.value + 1) % total
}

const movBoxStyle = computed(() => ({
  left: `${chartSelected.value * 250}px`,
}))

onMounted(async () => {
  await loadAllRanges()
  if (dateRanges.value[0].start) await loadChart(0)
})
</script>

<template>
  <div class="page-content">
    <div class="banner">
      <img :src="bannerImg" alt="">
      <h3 class="page-title">ENSO预测结果检验</h3>
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

      <div v-if="rangeErrors[chartSelected]" class="state-panel">
        <el-alert :title="rangeErrors[chartSelected]" type="error" :closable="false" show-icon />
        <el-button type="primary" plain @click="retryRange">重试日期加载</el-button>
      </div>

      <div class="description">{{ descriptions[chartSelected] }}</div>
    </section>

    <section
      class="chart-selector"
      :class="{ 'has-state': Boolean(dataErrors[chartSelected]) }"
      v-loading="dataLoading[chartSelected]"
    >
      <div v-if="dataErrors[chartSelected]" class="state-panel">
        <el-alert :title="dataErrors[chartSelected]" type="error" :closable="false" show-icon />
        <el-button type="primary" plain @click="loadChart()">重新加载</el-button>
      </div>

      <template v-else-if="hasActiveData">
        <p v-if="chartSelected === 1" class="chart-count">
          {{ errorIndex + 1 }}/{{ errorOptions.length }}
        </p>
        <v-chart class="chart" :option="activeOption" autoresize />
        <template v-if="chartSelected === 1 && errorOptions.length > 1">
          <el-button
            type="primary"
            class="arrow-left"
            :icon="ArrowLeft"
            aria-label="上一张误差图"
            @click="changeErrorChart('left')"
          />
          <el-button
            type="primary"
            class="arrow-right"
            :icon="ArrowRight"
            aria-label="下一张误差图"
            @click="changeErrorChart('right')"
          />
        </template>
      </template>

      <el-empty
        v-else-if="!dataLoading[chartSelected]"
        :description="`暂无${chartNames[chartSelected]}数据`"
      />
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

.menu::before {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 55%;
  background: rgba(240, 240, 240, 0.8);
  content: '';
  pointer-events: none;
}

.menu li {
  position: relative;
  display: flex;
  width: 250px;
  min-width: 250px;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  font-size: 17px;
}

.menu li p {
  position: relative;
  z-index: 1;
}

.menu li:not(:last-child)::after {
  position: absolute;
  top: 50%;
  right: 0;
  width: 2px;
  height: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.125);
  content: '';
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
  margin-right: 10%;
  margin-left: 10%;
}

.date-picker-container {
  display: flex;
  justify-content: flex-end;
  padding: 50px 0 30px;
}

.description {
  padding: 21px 16px;
  text-align: center;
  font-size: 17px;
  background: rgba(239, 242, 252, 0.8);
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
}

.chart-selector {
  position: relative;
  min-height: 520px;
  margin-top: 16px;
  margin-bottom: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
}

.chart-selector.has-state {
  min-height: 260px;
}

.chart {
  width: 100%;
  height: 50vh;
  min-height: 500px;
  padding: 20px 0;
  box-sizing: content-box;
}

.chart-count {
  position: absolute;
  z-index: 3;
  top: 16px;
  right: 88px;
  min-width: 54px;
  margin: 0;
  padding: 4px 10px;
  box-sizing: border-box;
  color: #606266;
  text-align: center;
  line-height: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(96, 98, 102, 0.18);
  border-radius: 999px;
  pointer-events: none;
}

.arrow-left,
.arrow-right {
  position: absolute;
  z-index: 2;
  top: 0;
  pointer-events: none;
}

.arrow-left :deep(.el-icon),
.arrow-right :deep(.el-icon) {
  z-index: 1;
  padding: 24px 12px;
  border-radius: 8px;
  cursor: pointer;
  pointer-events: auto;
}

.arrow-left:focus,
.arrow-right:focus {
  outline: none;
}

.arrow-left:focus-visible :deep(.el-icon),
.arrow-right:focus-visible :deep(.el-icon) {
  box-shadow: 0 0 0 2px rgba(45, 141, 210, 0.55);
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
  .menu {
    overflow-x: auto;
  }

  .page-title {
    margin-left: 8%;
    font-size: 40px;
  }

  .content-shell,
  .chart-selector {
    margin-right: 4%;
    margin-left: 4%;
  }
}
</style>
