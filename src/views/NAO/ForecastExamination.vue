<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import VChart from 'vue-echarts'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import bannerImg from '@/assets/nao.jpg'
import { preloadImages, resolveImageUrl } from '@/utils/image'
import { requestErrorMessage } from '@/utils/requestError'

const chartNames = ['模态预测', '指数预测']
const chartSelected = ref(0)
const descriptions = [
  '预测误差主要来自于对中纬度和冰岛附近低压的高估。模型能够预测出 NAO 的典型两极模态，模拟误差会随预测时长增加。',
  'NAOI 的中长期预测技巧优于失去预测能力后的数值模式，将 NAO 的有效预测时间扩展到了约六个月。',
]

const selectedDate = ref(null)
const dateRange = ref({ start: null, end: null })
const modalImages = ref([])
const modalImageIndex = ref(0)
const correlationOption = ref({})
const loading = ref([false, false])
const errors = ref(['', ''])
const requestIds = [0, 0]

const currentModalImage = computed(() => (
  resolveImageUrl(modalImages.value[modalImageIndex.value])
))
const hasCorrelationData = computed(() => (
  Object.keys(correlationOption.value || {}).length > 0
))
const modalTitle = computed(() => {
  if (!selectedDate.value) return 'NAO 预测结果分布误差图'
  return `${selectedDate.value.getFullYear()}年${selectedDate.value.getMonth() + 1}月 预测结果分布误差图`
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
  if (!dateRange.value.start || !dateRange.value.end) return false
  const value = monthNumber(time)
  return value < monthNumber(dateRange.value.start)
    || value > monthNumber(dateRange.value.end)
}

function normalizeImages(value) {
  const list = Array.isArray(value) ? value : [value]
  return list.filter((item) => typeof item === 'string' && item.trim())
}

async function initializeModal() {
  const requestId = ++requestIds[0]
  loading.value[0] = true
  errors.value[0] = ''
  modalImages.value = []
  modalImageIndex.value = 0

  try {
    const response = await axios.get('/nao/initialize/naoCORR')
    if (requestId !== requestIds[0]) return

    const start = createMonth(response.data?.start_year, response.data?.start_month)
    const end = createMonth(response.data?.end_year, response.data?.end_month)
    if (!start || !end || monthNumber(start) > monthNumber(end)) {
      throw new Error('Invalid NAO examination date range')
    }
    const images = normalizeImages(response.data?.data)
    if (images.length === 0) throw new Error('Empty NAO examination image list')

    dateRange.value = { start, end }
    selectedDate.value = new Date(end)
    modalImages.value = images
    preloadImages(images)
  } catch (error) {
    if (requestId !== requestIds[0]) return
    dateRange.value = { start: null, end: null }
    errors.value[0] = requestErrorMessage(error, 'NAO 模态检验初始化失败')
  } finally {
    if (requestId === requestIds[0]) loading.value[0] = false
  }
}

async function loadModal() {
  if (!selectedDate.value) return

  const requestId = ++requestIds[0]
  loading.value[0] = true
  errors.value[0] = ''
  modalImages.value = []
  modalImageIndex.value = 0

  try {
    const response = await axios.get('/nao/predictionExamination/nao', {
      params: {
        year: selectedDate.value.getFullYear(),
        month: selectedDate.value.getMonth() + 1,
      },
    })
    if (requestId !== requestIds[0]) return
    const images = normalizeImages(response.data)
    if (images.length === 0) throw new Error('Empty NAO examination image list')
    modalImages.value = images
    preloadImages(images)
  } catch (error) {
    if (requestId !== requestIds[0]) return
    errors.value[0] = requestErrorMessage(error, 'NAO 模态检验图片加载失败')
  } finally {
    if (requestId === requestIds[0]) loading.value[0] = false
  }
}

async function loadCorrelation() {
  const requestId = ++requestIds[1]
  loading.value[1] = true
  errors.value[1] = ''
  correlationOption.value = {}

  try {
    const response = await axios.get('/nao/predictionExamination/naoi')
    if (requestId !== requestIds[1]) return
    if (
      !response.data
      || typeof response.data !== 'object'
      || Object.keys(response.data).length === 0
    ) {
      throw new Error('Invalid NAO correlation chart')
    }
    correlationOption.value = response.data
  } catch (error) {
    if (requestId !== requestIds[1]) return
    errors.value[1] = requestErrorMessage(error, 'NAOI 相关系数加载失败')
  } finally {
    if (requestId === requestIds[1]) loading.value[1] = false
  }
}

function selectChart(index) {
  chartSelected.value = index
  if (index === 0 && modalImages.value.length === 0 && !loading.value[0]) {
    dateRange.value.start ? loadModal() : initializeModal()
  } else if (index === 1 && !hasCorrelationData.value && !loading.value[1]) {
    loadCorrelation()
  }
}

function handleDateChange() {
  document.activeElement?.blur()
  loadModal()
}

function retryActive() {
  if (chartSelected.value === 1) return loadCorrelation()
  return dateRange.value.start ? loadModal() : initializeModal()
}

function changeImageIndex(direction) {
  const total = modalImages.value.length
  if (total < 2) return
  modalImageIndex.value = direction === 'left'
    ? (modalImageIndex.value - 1 + total) % total
    : (modalImageIndex.value + 1) % total
}

const movBoxStyle = computed(() => ({
  left: `${chartSelected.value * 250}px`,
}))

onMounted(() => {
  initializeModal()
  loadCorrelation()
})
</script>

<template>
  <div class="page-content">
    <div class="banner">
      <img :src="bannerImg" alt="">
      <h3 class="page-title">NAO预测结果检验</h3>
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
      <div v-if="chartSelected === 0" class="date-picker-container">
        <el-date-picker
          v-model="selectedDate"
          type="month"
          :clearable="false"
          :disabled="loading[0] && !dateRange.start"
          :disabled-date="limitedDateRange"
          @change="handleDateChange"
        />
      </div>
      <div v-else class="date-independent-note">
        该指标为固定的提前期相关系数，不随起报日期变化。
      </div>

      <div class="description">{{ descriptions[chartSelected] }}</div>
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

      <div v-else-if="chartSelected === 0 && modalImages.length" class="picture-container">
        <h2>{{ modalTitle }}</h2>
        <p>{{ modalImageIndex + 1 }}/{{ modalImages.length }}</p>
        <img :src="currentModalImage" alt="NAO 预测结果分布误差图">
        <template v-if="modalImages.length > 1">
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
      <el-empty
        v-else-if="chartSelected === 0 && !loading[0]"
        description="暂无 NAO 模态检验图片"
      />

      <template v-else-if="chartSelected === 1">
        <h2 class="chart-title">NAOI指数预测的相关系数</h2>
        <v-chart v-if="hasCorrelationData" class="chart" :option="correlationOption" autoresize />
        <el-empty v-else-if="!loading[1]" description="暂无 NAOI 相关系数数据" />
      </template>
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

.date-picker-container,
.date-independent-note {
  display: flex;
  justify-content: flex-end;
  padding: 50px 0 30px;
}

.date-independent-note {
  color: #606266;
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
  overflow: hidden;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
}

.chart-selector.has-state {
  min-height: 260px;
}

.chart-title {
  margin: 20px 0 0;
  text-align: center;
  font-size: 18px;
}

.chart {
  height: 500px;
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
  padding: 20px;
}

.picture-container h2,
.picture-container p {
  margin: 0 0 10px;
  font-size: 18px;
}

.picture-container img {
  width: clamp(480px, 58%, 700px);
  max-width: 100%;
  height: auto;
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
    font-size: 40px;
  }

  .content-shell,
  .chart-selector {
    margin-right: 4%;
    margin-left: 4%;
  }
}
</style>
