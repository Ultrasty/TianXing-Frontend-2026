<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import VChart from 'vue-echarts'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import bannerImg from '@/assets/Ice.jpg'
import { preloadImages, resolveImageUrl } from '@/utils/image'
import { requestErrorMessage } from '@/utils/requestError'

const chartNames = ['SIE指数', 'SIC模态']
const chartSelected = ref(0)

const selectedDates = ref([null, null])
const sieAvailableMonths = ref([])
const sicAvailableDates = ref([])
const loading = ref([false, false])
const errors = ref(['', ''])
const requestIds = [0, 0]

const sieOption = ref({})
const sieDescription = ref('')
const sicImages = ref([])
const sicImageIndex = ref(0)

const selectedTime = computed({
  get: () => selectedDates.value[chartSelected.value],
  set: (value) => {
    selectedDates.value[chartSelected.value] = value
  },
})
const selectedSieDate = computed(() => selectedDates.value[0])
const selectedSicDate = computed(() => selectedDates.value[1])
const hasSieData = computed(() => Object.keys(sieOption.value || {}).length > 0)
const currentSicImage = computed(() => resolveImageUrl(sicImages.value[sicImageIndex.value]))

const sieTitle = computed(() => {
  const date = selectedSieDate.value
  if (!date) return '海冰范围预测结果'
  const end = new Date(date.getFullYear(), date.getMonth() + 11, 1)
  return `${date.getFullYear()}年${date.getMonth() + 1}月~${end.getFullYear()}年${end.getMonth() + 1}月 海冰预测结果`
})

const sicTitle = computed(() => {
  const date = selectedSicDate.value
  if (!date) return '海冰 SIC 预测结果'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 海冰SIC预测结果`
})
function toNumber(value) {
  const number = Number(value)
  return Number.isInteger(number) ? number : null
}

function createMonth(yearValue, monthValue) {
  const year = toNumber(yearValue)
  const month = toNumber(monthValue)
  if (year === null || month === null || month < 1 || month > 12) return null
  return new Date(year, month - 1, 1)
}

function createDay(yearValue, monthValue, dayValue) {
  const year = toNumber(yearValue)
  const month = toNumber(monthValue)
  const day = toNumber(dayValue)
  if (
    year === null
    || month === null
    || day === null
    || month < 1
    || month > 12
    || day < 1
    || day > 31
  ) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return null
  return date
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dayKey(date) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

function uniqueSortedDates(dates, keyFunction) {
  const unique = new Map()
  dates.filter(Boolean).forEach((date) => unique.set(keyFunction(date), date))
  return [...unique.values()].sort((left, right) => left.getTime() - right.getTime())
}

function normalizeSieAvailability(data) {
  if (Array.isArray(data?.availableMonths)) {
    return uniqueSortedDates(
      data.availableMonths.map((item) => createMonth(item?.year, item?.month)),
      monthKey,
    )
  }

  const years = Array.isArray(data?.yearList) ? data.yearList : []
  const months = Array.isArray(data?.monthList) ? data.monthList : []
  const defaultYear = toNumber(data?.defaultYear)
  const defaultMonth = toNumber(data?.defaultMonth)

  return uniqueSortedDates(
    years.flatMap((yearValue) => months.map((monthValue) => {
      const year = toNumber(yearValue)
      const month = toNumber(monthValue)
      if (
        year === null
        || month === null
        || (defaultYear !== null && year > defaultYear)
        || (defaultYear !== null && defaultMonth !== null && year === defaultYear && month > defaultMonth)
      ) return null
      return createMonth(year, month)
    })),
    monthKey,
  )
}

function normalizeSicAvailability(data) {
  if (Array.isArray(data?.availableDates)) {
    return uniqueSortedDates(
      data.availableDates.map((item) => createDay(item?.year, item?.month, item?.day)),
      dayKey,
    )
  }

  // 旧接口的 monthList/dateList 只描述最新年和最新月。
  // 保守地只开放这些能被确认存在的日期，避免把三个集合做笛卡尔积。
  const years = (Array.isArray(data?.yearList) ? data.yearList : [])
    .map(toNumber)
    .filter((value) => value !== null)
  const months = (Array.isArray(data?.monthList) ? data.monthList : [])
    .map(toNumber)
    .filter((value) => value !== null)
  const days = Array.isArray(data?.dateList) ? data.dateList : []
  const latestYear = toNumber(data?.defaultYear) ?? Math.max(...years)
  const latestMonth = toNumber(data?.defaultMonth) ?? Math.max(...months)

  if (!Number.isFinite(latestYear) || !Number.isFinite(latestMonth)) return []
  return uniqueSortedDates(
    days.map((day) => createDay(latestYear, latestMonth, day)),
    dayKey,
  )
}

function normalizeImages(value) {
  const list = Array.isArray(value) ? value : []
  return list.filter((item) => typeof item === 'string' && item.trim())
}

function disabledDate(time) {
  if (chartSelected.value === 0) {
    const available = new Set(sieAvailableMonths.value.map(monthKey))
    return !available.has(monthKey(time))
  }

  const available = new Set(sicAvailableDates.value.map(dayKey))
  return !available.has(dayKey(time))
}

async function initializeSie() {
  const requestId = ++requestIds[0]
  loading.value[0] = true
  errors.value[0] = ''
  sieAvailableMonths.value = []
  sieOption.value = {}
  sieDescription.value = ''

  try {
    const response = await axios.get('/seaice/initial/SIEprediction')
    if (requestId !== requestIds[0]) return

    const available = normalizeSieAvailability(response.data)
    if (available.length === 0) throw new Error('Empty SIE availability')
    sieAvailableMonths.value = available

    const defaultDate = createMonth(
      response.data?.defaultYear,
      response.data?.defaultMonth,
    )
    selectedDates.value[0] = defaultDate && available.some(
      (item) => monthKey(item) === monthKey(defaultDate),
    )
      ? defaultDate
      : new Date(available[available.length - 1])
  } catch (error) {
    if (requestId !== requestIds[0]) return
    selectedDates.value[0] = null
    errors.value[0] = requestErrorMessage(error, 'SIE 可用日期初始化失败')
  } finally {
    if (requestId === requestIds[0]) loading.value[0] = false
  }
}

async function initializeSic() {
  const requestId = ++requestIds[1]
  loading.value[1] = true
  errors.value[1] = ''
  sicAvailableDates.value = []
  sicImages.value = []
  sicImageIndex.value = 0

  try {
    const response = await axios.get('/seaice/initial/SICprediction')
    if (requestId !== requestIds[1]) return

    const available = normalizeSicAvailability(response.data)
    if (available.length === 0) throw new Error('Empty SIC availability')
    sicAvailableDates.value = available

    const defaultDate = createDay(
      response.data?.defaultYear,
      response.data?.defaultMonth,
      response.data?.defaultDay,
    )
    selectedDates.value[1] = defaultDate && available.some(
      (item) => dayKey(item) === dayKey(defaultDate),
    )
      ? defaultDate
      : new Date(available[available.length - 1])

    const images = normalizeImages(response.data?.sicInitial)
    if (images.length === 0) throw new Error('Empty SIC initialization images')
    sicImages.value = images
    preloadImages(images)
  } catch (error) {
    if (requestId !== requestIds[1]) return
    selectedDates.value[1] = null
    errors.value[1] = requestErrorMessage(error, 'SIC 可用日期初始化失败')
  } finally {
    if (requestId === requestIds[1]) loading.value[1] = false
  }
}

async function updateSieChart() {
  const date = selectedSieDate.value
  if (!date) return

  const requestId = ++requestIds[0]
  loading.value[0] = true
  errors.value[0] = ''
  sieOption.value = {}
  sieDescription.value = ''

  try {
    const response = await axios.get('/seaice/predictionResult/SIE', {
      params: {
        year: String(date.getFullYear()),
        month: String(date.getMonth() + 1),
      },
    })
    if (requestId !== requestIds[0]) return
    if (
      !response.data?.option
      || typeof response.data.option !== 'object'
      || Object.keys(response.data.option).length === 0
    ) {
      throw new Error('Invalid SIE response')
    }
    sieOption.value = response.data.option
    sieDescription.value = response.data.description || ''
  } catch (error) {
    if (requestId !== requestIds[0]) return
    errors.value[0] = requestErrorMessage(error, 'SIE 预测结果加载失败')
  } finally {
    if (requestId === requestIds[0]) loading.value[0] = false
  }
}

async function updateSicChart() {
  const date = selectedSicDate.value
  if (!date) return

  const requestId = ++requestIds[1]
  loading.value[1] = true
  errors.value[1] = ''
  sicImages.value = []
  sicImageIndex.value = 0

  try {
    const response = await axios.get('/seaice/predictionResult/SIC', {
      params: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      },
    })
    if (requestId !== requestIds[1]) return
    const images = normalizeImages(response.data)
    if (images.length === 0) throw new Error('Empty SIC image list')
    sicImages.value = images
    preloadImages(images)
  } catch (error) {
    if (requestId !== requestIds[1]) return
    errors.value[1] = requestErrorMessage(error, 'SIC 预测结果加载失败')
  } finally {
    if (requestId === requestIds[1]) loading.value[1] = false
  }
}

function selectChart(index) {
  chartSelected.value = index
  // 每个 Tab 保留自己的最后选择，不再切换时写死或重置日期。
  if (index === 0 && !hasSieData.value && !loading.value[0]) {
    sieAvailableMonths.value.length ? updateSieChart() : initializeAndLoadSie()
  } else if (index === 1 && sicImages.value.length === 0 && !loading.value[1]) {
    sicAvailableDates.value.length ? updateSicChart() : initializeSic()
  }
}

async function initializeAndLoadSie() {
  await initializeSie()
  if (selectedSieDate.value && !errors.value[0]) await updateSieChart()
}

function handleDateChange() {
  document.activeElement?.blur()
  if (chartSelected.value === 0) updateSieChart()
  else updateSicChart()
}

function retryActive() {
  if (chartSelected.value === 0) {
    return sieAvailableMonths.value.length ? updateSieChart() : initializeAndLoadSie()
  }
  return sicAvailableDates.value.length ? updateSicChart() : initializeSic()
}

function changeImageIndex(direction) {
  const total = sicImages.value.length
  if (total < 2) return
  sicImageIndex.value = direction === 'left'
    ? (sicImageIndex.value - 1 + total) % total
    : (sicImageIndex.value + 1) % total
}

const movBoxStyle = computed(() => ({
  left: `${chartSelected.value * 250}px`,
}))

onMounted(async () => {
  await Promise.all([initializeSie(), initializeSic()])
  if (selectedSieDate.value && !errors.value[0]) await updateSieChart()
})
</script>

<template>
  <div class="page-content">
    <div class="banner">
      <img :src="bannerImg" alt="">
      <h3 class="page-title">海冰预测结果</h3>
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
          v-model="selectedTime"
          :type="chartSelected === 0 ? 'month' : 'date'"
          :clearable="false"
          :disabled="loading[chartSelected] && !selectedTime"
          :disabled-date="disabledDate"
          @change="handleDateChange"
        />
      </div>

      <div v-if="chartSelected === 0 && sieDescription" class="description">
        {{ sieDescription }}
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
        <h3 v-if="hasSieData" class="chart-title">{{ sieTitle }}</h3>
        <v-chart v-if="hasSieData" class="chart" :option="sieOption" autoresize />
        <el-empty v-else-if="!loading[0]" description="暂无 SIE 预测数据" />
      </template>

      <div v-else-if="sicImages.length" class="picture-container">
        <h3>{{ sicTitle }}</h3>
        <p>{{ sicImageIndex + 1 }}/{{ sicImages.length }}</p>
        <img :src="currentSicImage" alt="海冰 SIC 预测图">
        <template v-if="sicImages.length > 1">
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
      <el-empty v-else-if="chartSelected === 1 && !loading[1]" description="暂无 SIC 预测图片" />
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
  padding: 20px clamp(88px, 12%, 160px);
}

.picture-container h3,
.picture-container p {
  margin: 0 0 10px;
}

.picture-container img {
  max-width: 95%;
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

  .picture-container {
    padding-right: 56px;
    padding-left: 56px;
  }
}
</style>
