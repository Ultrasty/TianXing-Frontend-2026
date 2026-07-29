<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import VChart from 'vue-echarts'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import bannerImg from '@/assets/nao.jpg'
import { preloadImages, resolveImageUrl } from '@/utils/image'
import { requestErrorMessage } from '@/utils/requestError'

const chartNames = ['指数预测', '模态预测']
const chartSelected = ref(0)

const selectedDates = ref([null, null])
const dateRanges = ref([
  { start: null, end: null },
  { start: null, end: null },
])
const loading = ref([false, false])
const errors = ref(['', ''])
const requestIds = [0, 0]

const naoiOption = ref({})
const naoiDescription = ref('')
const slpImages = ref([])
const slpImageIndex = ref(0)

const currentDate = computed({
  get: () => selectedDates.value[chartSelected.value],
  set: (value) => {
    selectedDates.value[chartSelected.value] = value
  },
})
const activeRange = computed(() => dateRanges.value[chartSelected.value])
const hasNaoiData = computed(() => Object.keys(naoiOption.value || {}).length > 0)
const currentSlpImage = computed(() => resolveImageUrl(slpImages.value[slpImageIndex.value]))
const slpTitle = computed(() => {
  const date = selectedDates.value[1]
  if (!date) return '北大西洋 SLP 预测结果'
  return `${date.getFullYear()}年${date.getMonth() + 1}月 北大西洋SLP预测结果`
})

function createMonth(yearValue, monthValue) {
  const year = Number(yearValue)
  const month = Number(monthValue)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }
  return new Date(year, month - 1, 1)
}

function monthNumber(date) {
  return date.getFullYear() * 12 + date.getMonth()
}

function limitedDateRange(time) {
  const range = activeRange.value
  if (!range?.start || !range?.end) return false
  const value = monthNumber(time)
  return value < monthNumber(range.start) || value > monthNumber(range.end)
}

function setRange(index, data) {
  const start = createMonth(data?.start_year, data?.start_month)
  const end = createMonth(data?.end_year, data?.end_month)
  if (!start || !end || monthNumber(start) > monthNumber(end)) {
    throw new Error('Invalid NAO date range')
  }
  dateRanges.value[index] = { start, end }
  selectedDates.value[index] = new Date(end)
}

async function initializeNaoi() {
  const requestId = ++requestIds[0]
  loading.value[0] = true
  errors.value[0] = ''
  naoiOption.value = {}
  naoiDescription.value = ''

  try {
    const response = await axios.get('/nao/initialize/naoPrediction')
    if (requestId !== requestIds[0]) return
    setRange(0, response.data)

    if (
      !response.data?.option
      || typeof response.data.option !== 'object'
      || Object.keys(response.data.option).length === 0
    ) {
      throw new Error('Invalid NAO index initialization data')
    }
    naoiOption.value = response.data.option
    naoiDescription.value = response.data.description || ''
  } catch (error) {
    if (requestId !== requestIds[0]) return
    dateRanges.value[0] = { start: null, end: null }
    errors.value[0] = requestErrorMessage(error, 'NAO 指数预测初始化失败')
  } finally {
    if (requestId === requestIds[0]) loading.value[0] = false
  }
}

async function initializeSlp() {
  const requestId = ++requestIds[1]
  loading.value[1] = true
  errors.value[1] = ''
  slpImages.value = []
  slpImageIndex.value = 0

  try {
    const response = await axios.get('/nao/initialize/naoGrid')
    if (requestId !== requestIds[1]) return
    setRange(1, response.data)

    const images = Array.isArray(response.data?.data)
      ? response.data.data.filter((item) => typeof item === 'string' && item)
      : []
    if (images.length === 0) throw new Error('Empty NAO grid image list')
    slpImages.value = images
    preloadImages(images)
  } catch (error) {
    if (requestId !== requestIds[1]) return
    dateRanges.value[1] = { start: null, end: null }
    errors.value[1] = requestErrorMessage(error, 'NAO 模态预测初始化失败')
  } finally {
    if (requestId === requestIds[1]) loading.value[1] = false
  }
}

async function updateNaoi() {
  const date = selectedDates.value[0]
  if (!date) return

  const requestId = ++requestIds[0]
  loading.value[0] = true
  errors.value[0] = ''
  naoiOption.value = {}
  naoiDescription.value = ''

  try {
    const response = await axios.get('/nao/predictionResult/nao', {
      params: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    })
    if (requestId !== requestIds[0]) return
    if (
      !response.data?.option
      || typeof response.data.option !== 'object'
      || Object.keys(response.data.option).length === 0
    ) {
      throw new Error('Invalid NAO index response')
    }
    naoiOption.value = response.data.option
    naoiDescription.value = response.data.description || ''
  } catch (error) {
    if (requestId !== requestIds[0]) return
    errors.value[0] = requestErrorMessage(error, 'NAO 指数预测加载失败')
  } finally {
    if (requestId === requestIds[0]) loading.value[0] = false
  }
}

async function updateSlp() {
  const date = selectedDates.value[1]
  if (!date) return

  const requestId = ++requestIds[1]
  loading.value[1] = true
  errors.value[1] = ''
  slpImages.value = []
  slpImageIndex.value = 0

  try {
    const response = await axios.get('/nao/findGridData/nao', {
      params: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    })
    if (requestId !== requestIds[1]) return
    const images = Array.isArray(response.data)
      ? response.data.filter((item) => typeof item === 'string' && item)
      : []
    if (images.length === 0) throw new Error('Empty NAO grid image list')
    slpImages.value = images
    preloadImages(images)
  } catch (error) {
    if (requestId !== requestIds[1]) return
    errors.value[1] = requestErrorMessage(error, 'NAO 模态预测加载失败')
  } finally {
    if (requestId === requestIds[1]) loading.value[1] = false
  }
}

function handleDateChange() {
  document.activeElement?.blur()
  if (chartSelected.value === 0) updateNaoi()
  else updateSlp()
}

function selectChart(index) {
  chartSelected.value = index
}

function retryActive() {
  if (!activeRange.value?.start) {
    return chartSelected.value === 0 ? initializeNaoi() : initializeSlp()
  }
  return chartSelected.value === 0 ? updateNaoi() : updateSlp()
}

function changeImageIndex(direction) {
  const total = slpImages.value.length
  if (total < 2) return
  slpImageIndex.value = direction === 'left'
    ? (slpImageIndex.value - 1 + total) % total
    : (slpImageIndex.value + 1) % total
}

const movBoxStyle = computed(() => ({
  left: `${chartSelected.value * 250}px`,
}))

onMounted(() => {
  initializeNaoi()
  initializeSlp()
})
</script>

<template>
  <div class="page-content">
    <div class="banner">
      <img :src="bannerImg" alt="">
      <h3 class="page-title">NAO预测结果</h3>
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
          :disabled="loading[chartSelected] && !activeRange.start"
          :disabled-date="limitedDateRange"
          @change="handleDateChange"
        />
      </div>

      <div v-if="chartSelected === 0 && naoiDescription" class="description">
        {{ naoiDescription }}
      </div>
    </section>

    <section
      class="chart-selector"
      :class="{ 'has-state': Boolean(errors[chartSelected]) }"
      v-loading="loading[chartSelected]"
    >
      <div v-if="errors[chartSelected]" class="state-panel">
        <el-alert :title="errors[chartSelected]" type="error" :closable="false" show-icon />
        <el-button type="primary" plain @click="retryActive">重新加载</el-button>
      </div>

      <template v-else-if="chartSelected === 0">
        <v-chart v-if="hasNaoiData" class="chart" :option="naoiOption" autoresize />
        <el-empty v-else-if="!loading[0]" description="暂无 NAO 指数预测数据" />
      </template>

      <div v-else-if="slpImages.length" class="picture-container">
        <h3>{{ slpTitle }}</h3>
        <p>{{ slpImageIndex + 1 }}/{{ slpImages.length }}</p>
        <img :src="currentSlpImage" alt="北大西洋 SLP 预测图">
        <template v-if="slpImages.length > 1">
          <el-button
            type="primary"
            class="arrow-left"
            :icon="ArrowLeft"
            aria-label="上一张"
            @click="changeImageIndex('left')"
          />
          <el-button
            type="primary"
            class="arrow-right"
            :icon="ArrowRight"
            aria-label="下一张"
            @click="changeImageIndex('right')"
          />
        </template>
      </div>
      <el-empty v-else-if="chartSelected === 1 && !loading[1]" description="暂无 NAO 模态预测图片" />
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
  object-position: 50% -155px;
}

.page-title {
  position: relative;
  z-index: 1;
  margin-left: 20%;
  color: rgb(19, 24, 36);
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
  margin-right: 10%;
  margin-left: 10%;
}

.date-picker-container {
  display: flex;
  justify-content: flex-end;
  padding: 50px 0 30px;
}

.description {
  padding: 18px;
  text-align: center;
  font-size: 17px;
  background: rgba(239, 242, 252, 0.8);
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
}

.chart-selector {
  position: relative;
  min-height: 500px;
  margin-top: 28px;
  margin-bottom: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
}

.chart-selector.has-state {
  min-height: 260px;
}

.chart {
  height: 500px;
  padding: 20px 0;
  box-sizing: content-box;
}

.picture-container {
  position: relative;
  display: flex;
  min-height: 500px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
}

.picture-container h3,
.picture-container p {
  margin: 0 0 10px;
}

.picture-container img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
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
}
</style>
