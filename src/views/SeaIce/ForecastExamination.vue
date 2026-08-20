<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import VChart from 'vue-echarts'
import bannerImg from '@/assets/Ice.jpg'
import { requestErrorMessage } from '@/utils/requestError'

const chartNames = ['SIC日预测误差', 'SIC误差统计', 'SIE误差分析']
const chartSelected = ref(0)
const selectedDates = ref([null, null, null])
const availableValues = ref([[], [], []])
const availabilityLoading = ref([false, false, false])
const availabilityErrors = ref(['', '', ''])
const dataLoading = ref([false, false, false])
const dataErrors = ref(['', '', ''])
const availabilityRequestIds = [0, 0, 0]
const requestIds = [0, 0, 0]
const tabCharts = ref([[], [], []])

const descriptions = computed(() => {
  const date = selectedDates.value[chartSelected.value]
  const year = date?.getFullYear()
  const month = date ? date.getMonth() + 1 : null
  return [
    year && month
      ? `展示${year}年${month}月的4周 SIC 预测结果与基线方法的比较。`
      : '展示所选月份的4周 SIC 预测结果与基线方法的比较。',
    year
      ? `展示${year}年四种 SIC 预测方法提前1至7天的误差统计。`
      : '展示所选年份四种 SIC 预测方法提前1至7天的误差统计。',
    year
      ? `展示截至${year}年的 SIE 预测误差构成、相关系数和标准差。`
      : '展示所选年份的 SIE 预测误差构成、相关系数和标准差。',
  ]
})

const selectedTime = computed({
  get: () => selectedDates.value[chartSelected.value],
  set: (value) => {
    selectedDates.value[chartSelected.value] = value
  },
})
const activeCharts = computed(() => tabCharts.value[chartSelected.value] || [])
const selectedYear = computed(() => selectedDates.value[0]?.getFullYear() ?? new Date().getFullYear())
const selectedMonth = computed(() => (selectedDates.value[0]?.getMonth() ?? 0) + 1)

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isInteger(number) ? number : null
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const start_year1 = ref(null);
const start_month1 = ref(null);
const start_year2 = ref(null);
const start_month2 = ref(null);
const start_year3 = ref(null);
const start_month3 = ref(null);

const start_year = ref(2023);     //可选时间范围
const end_year = ref(2023);
const start_month = ref(1);     //可选时间范围
const end_month = ref(1);

const moveBoxLeft = computed(() => chartSelected.value * 250);
const movBoxStyle = computed(() => ({
  position: "absolute",
  bottom: "0px",
  left: `${moveBoxLeft.value}px`,
  height: "2px",
  width: "125px",
  transform: "translateX(50%)",
  backgroundColor: "rgb(143,178,201)",
  transition: "left 0.3s ease"
}));

const limitedDateRange = (time) => {
  return time.getFullYear() < start_year.value || time.getFullYear() > end_year.value;
};
const limitedDateRange2 = (time) => {
  return ((time.getFullYear() < start_year.value || time.getFullYear() > end_year.value) && (time.getMonth() >= 0 && time.getMonth() <= 11)) || ((time.getFullYear() >= start_year.value && time.getFullYear() <= end_year.value) && ((time.getMonth() >= end_month.value && time.getMonth() <= 11)));
};


const SICChartErroPrediction = ref('这张图显示了2023年1月的4周SIC预测结果与基线方法的比较。预测结果始终优于persistence，在第28天，预测结果比persistence的RMSE低26.48%，证明了预测结果的有效性。')

const SICChartErroAdd = ref('这张图显示了2022年里四种SIC预测结果提前1到7天的统计结果。MITgcm output (with DA) with BC显著降低了SIC的预测误差，RMSE一直低于0.09，更好地提高了SIC预报结果准确性。')

const SIEChartErroAnalyse = ref('rmsd用来分析预报误差成因，其由偏差与方差两部分组成。从图b可以看出，除2020与2022年春季外，其他年份季节的rmsd主要由偏差构成，而从图d可知，当预报与观测之间的标准差偏差大时，对应了偏差的大值部分。而对于2020年与2022年春季的rmsd主要由方差构成，对应图c可知，当预报相关性系数较低时会造成较大的方差。')


const chartTitle = ref('')
chartTitle.value = `${selectedYear.value}年${selectedMonth.value}月 预测结果误差折线图`


const chartTitle2 = ref('')
chartTitle2.value = `${selectedYear.value}年${selectedMonth.value}月~${Number(selectedYear.value) + 1 + ''}年${selectedMonth.value}月 预测结果误差折线图`

const chartTitle3 = ref('')
chartTitle3.value = `${selectedYear.value}年SIC回报结果误差箱型图`

const chartTitle4 = ref('')
chartTitle4.value = `SIE预测误差分析`

const option1 = ref({})
const option2 = ref({})
const option3 = ref({})
const option4 = ref({})
const option5 = ref({})
const option6 = ref({})
const option7 = ref({})


const chartX = ref('')
const chartX1 = ref('')
chartX.value = [`${selectedYear.value}/${selectedMonth.value}/1`, `${selectedYear.value}/${selectedMonth.value}/2`, `${selectedYear.value}/${selectedMonth.value}/3`,
`${selectedYear.value}/${selectedMonth.value}/4`, `${selectedYear.value}/${selectedMonth.value}/5`, `${selectedYear.value}/${selectedMonth.value}/6`,
`${selectedYear.value}/${selectedMonth.value}/7`, `${selectedYear.value}/${selectedMonth.value}/8`, `${selectedYear.value}/${selectedMonth.value}/9`,
`${selectedYear.value}/${selectedMonth.value}/10`, `${selectedYear.value}/${selectedMonth.value}/11`, `${selectedYear.value}/${selectedMonth.value}/12`,
`${selectedYear.value}/${selectedMonth.value}/13`, `${selectedYear.value}/${selectedMonth.value}/14`, `${selectedYear.value}/${selectedMonth.value}/15`,
`${selectedYear.value}/${selectedMonth.value}/16`, `${selectedYear.value}/${selectedMonth.value}/17`, `${selectedYear.value}/${selectedMonth.value}/18`,
`${selectedYear.value}/${selectedMonth.value}/19`, `${selectedYear.value}/${selectedMonth.value}/20`, `${selectedYear.value}/${selectedMonth.value}/21`,
`${selectedYear.value}/${selectedMonth.value}/22`, `${selectedYear.value}/${selectedMonth.value}/23`, `${selectedYear.value}/${selectedMonth.value}/24`,
`${selectedYear.value}/${selectedMonth.value}/25`, `${selectedYear.value}/${selectedMonth.value}/26`, `${selectedYear.value}/${selectedMonth.value}/27`,]

chartX1.value = [`${selectedYear.value - 2}spring`, `${selectedYear.value - 2}summer`, `${selectedYear.value - 2}fall`, `${selectedYear.value - 2}winter`,
`${selectedYear.value - 1}spring`, `${selectedYear.value - 1}summer`, `${selectedYear.value - 1}fall`, `${selectedYear.value - 1}winter`,
`${selectedYear.value}spring`, `${selectedYear.value}summer`, `${selectedYear.value}fall`, `${selectedYear.value}winter`
]

const updateTab1 = () => {
  axios.get('/seaice/error?year=' + Number(selectedYear.value) + '&month=' + Number(selectedMonth.value))
    .then(response => {
      console.log(response.data);
      const baccKey = `${selectedYear.value}_BACC`;
      const persistenceBaccKey = `${selectedYear.value}_per_BACC`;
      const rmseKey = `${selectedYear.value}_RMSE`;
      const persistenceRmseKey = `${selectedYear.value}_per_RMSE`;
      const sampleCount = Math.max(response.data[baccKey]?.length || 0, response.data[rmseKey]?.length || 0);
      const metricSamples = Array.from({ length: sampleCount }, (_, index) => `样本${index + 1}`);
      const asPercent = (key) => (response.data[key] || []).map(value => value * 100);
      option1.value = {
        title: {
          text: chartTitle.value,
          left: 'center' //标题水平居中
        },
        tooltip: {},
        xAxis: {
          type: 'category',
          name: '时间',
          data: metricSamples
        },
        yAxis: {
          type: 'value',
          name: 'BACC(%)',
          data: [10, 12, 14, 16, 18]
        },
        legend: { //图例
          data: ['ours', 'persistence'],
          orient: 'horizontal',
          left: 'center',
          bottom: '5',
        },
        series: [
          {
            name: 'ours',
            type: 'line',
            data: asPercent(baccKey),

          },
          {
            name: 'persistence',
            type: 'line',
            data: asPercent(persistenceBaccKey),
          },

        ]
      }

      option2.value = {
        tooltip: {},
        xAxis: {
          type: 'category',
          name: '时间',
          data: metricSamples
        },
        yAxis: {
          type: 'value',
          name: 'RMSE(%)',
          data: [10, 12, 14, 16, 18]
        },
        legend: { //图例
          data: ['ours', 'persistence'],
          orient: 'horizontal',
          left: 'center',
          bottom: '5',
        },
        series: [
          {
            name: 'ours',
            type: 'line',
            data: asPercent(rmseKey),
          },
          {
            name: 'persistence',
            type: 'line',
            data: asPercent(persistenceRmseKey),
          },

        ]
      }
      // SICChartErroPrediction.value = response.data.description;
    })
    .catch(error => {
      console.error(error);
    });
}

function createMonth(yearValue, monthValue = 1) {
  const year = toNumber(yearValue)
  const month = toNumber(monthValue)
  if (year === null || month === null || month < 1 || month > 12) return null
  return new Date(year, month - 1, 1)
}


const updateTab3 = () => {
  axios.get('/seaice/predictionExamination/errorAnalysis?year=' + Number(selectedYear.value))
    .then(response => {
      console.log(response.data);
      option4.value = {
        title: {
          text: chartTitle4.value,
          left: 'center' //标题水平居中
        },
        tooltip: {},
        xAxis: {
          type: 'category',
          // name: '时间',
          data: Array.from({ length: 12 }, (_, index) => `提前${index + 1}月`)
        },
        yAxis: {
          type: 'value',
          name: 'RMSD(million km²)',
          data: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
        },
        legend: { //图例
          data: [''],
          orient: 'horizontal',
          left: 'center',
          bottom: '5',
        },
        series: [
          {
            type: 'line',
            data: response.data["RMSD"]
          }
        ]
      }
      option5.value = {
        title: {
          // text: chartTitle4.value,
          left: 'center' //标题水平居中
        },
        tooltip: {},
        xAxis: {
          type: 'category',
          // name: '时间',
          data: Array.from({ length: 12 }, (_, index) => `提前${index + 1}月`)
        },
        yAxis: {
          type: 'value',
          name: 'RMSD²(million km²)',
          data: [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8]
        },
        legend: { //图例
          data: ['bais', 'variance'],
          orient: 'horizontal',
          left: 'center',
          bottom: '5',
        },
        series: [
          {
            name: 'bais',
            type: 'bar',
            data: response.data["BAIS"]
          },
          {
            name: 'variance',
            type: 'bar',
            data: response.data["VAR"]
          },

        ]
      }
      option6.value = {
        title: {
          // text: chartTitle4.value,
          left: 'center' //标题水平居中
        },
        tooltip: {},
        xAxis: {
          type: 'category',
          // name: '时间',
          data: Array.from({ length: 12 }, (_, index) => `提前${index + 1}月`)
        },
        yAxis: {
          type: 'value',
          name: 'Correlation coefficient',
          data: [0.970, 0.975, 0.980, 0.985, 0.990, 0.995, 1.000]
        },
        legend: { //图例
          data: [''],
          orient: 'horizontal',
          left: 'center',
          bottom: '5',
        },
        series: [
          {
            type: 'line',
            data: response.data["CORRELATION"]
          }
        ]
      }

      option7.value = {
        title: {
          // text: chartTitle4.value,
          left: 'center' //标题水平居中
        },
        tooltip: {},
        xAxis: {
          type: 'category',
          // name: '时间',
          data: Array.from({ length: 12 }, (_, index) => `提前${index + 1}月`)
        },
        yAxis: {
          type: 'value',
          name: 'standard deviation(million km²)',
          data: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]
        },
        legend: { //图例
          data: ['observation', 'IceTFT'],
          orient: 'horizontal',
          left: 'center',
          bottom: '5',
        },
        series: [
          {
            name: 'observation',
            type: 'line',
            data: response.data["OBS_STD"]
          },
          {
            name: 'IceTFT',
            type: 'line',
            data: response.data["PRE_STD"]
          }
        ]
      }
    })
    .catch(error => {
      console.error(error);
    });
}

function uniqueDates(dates, keyFunction) {
  const unique = new Map()
  dates.filter(Boolean).forEach((date) => unique.set(keyFunction(date), date))
  return [...unique.values()].sort((left, right) => left.getTime() - right.getTime())
}

function parseAvailableMonths(data) {
  if (Array.isArray(data?.availableMonths)) {
    return uniqueDates(
      data.availableMonths.map((item) => createMonth(item?.year, item?.month)),
      monthKey,
    )
  }

  const years = Array.isArray(data?.yearList) ? data.yearList : []
  const months = Array.isArray(data?.monthList) ? data.monthList : []
  return uniqueDates(
    years.flatMap((year) => months.map((month) => createMonth(year, month))),
    monthKey,
  )
}

function parseAvailableYears(data) {
  const years = Array.isArray(data?.yearList) ? data.yearList : []
  return uniqueDates(
    years.map((year) => createMonth(year, 1)),
    (date) => String(date.getFullYear()),
  )
}

function initialEndpoint(index) {
  return [
    '/seaice/initial/SICError',
    '/seaice/initial/SICErrorBox',
    '/seaice/initial/SIEErrorAnalysis',
  ][index]
}

async function loadAvailability(index) {
  const requestId = ++availabilityRequestIds[index]
  availabilityLoading.value[index] = true
  availabilityErrors.value[index] = ''

  try {
    const response = await axios.get(initialEndpoint(index))
    if (requestId !== availabilityRequestIds[index]) return
    const available = index === 0
      ? parseAvailableMonths(response.data)
      : parseAvailableYears(response.data)
    if (available.length === 0) throw new Error('Empty sea-ice examination availability')

    availableValues.value[index] = available
    const current = selectedDates.value[index]
    const key = index === 0
      ? (date) => monthKey(date)
      : (date) => String(date.getFullYear())
    selectedDates.value[index] = current && available.some(
      (item) => key(item) === key(current),
    )
      ? current
      : new Date(available[available.length - 1])
  } catch (error) {
    if (requestId !== availabilityRequestIds[index]) return
    availableValues.value[index] = []
    selectedDates.value[index] = null
    availabilityErrors.value[index] = requestErrorMessage(
      error,
      `${chartNames[index]}可选日期加载失败`,
    )
  } finally {
    if (requestId === availabilityRequestIds[index]) {
      availabilityLoading.value[index] = false
    }
  }
}

function disabledDate(time) {
  const available = availableValues.value[chartSelected.value]
  if (available.length === 0) return false

  if (chartSelected.value === 0) {
    const keys = new Set(available.map(monthKey))
    return !keys.has(monthKey(time))
  }
  const years = new Set(available.map((date) => date.getFullYear()))
  return !years.has(time.getFullYear())
}

function asPercentage(values) {
  return values.map((value) => Number(value) * 100)
}

function createLineOptions(data, date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const bacc = data?.[`${year}_BACC`]
  const persistenceBacc = data?.[`${year}_per_BACC`]
  const rmse = data?.[`${year}_RMSE`]
  const persistenceRmse = data?.[`${year}_per_RMSE`]
  if (![bacc, persistenceBacc, rmse, persistenceRmse].every(Array.isArray)) {
    throw new Error('Invalid SIC daily error response')
  }

  const length = Math.max(
    bacc.length,
    persistenceBacc.length,
    rmse.length,
    persistenceRmse.length,
  )
  const dates = Array.from({ length }, (_, index) => {
    const value = new Date(year, month - 1, index + 1)
    return `${value.getFullYear()}/${value.getMonth() + 1}/${value.getDate()}`
  })

  const baseOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', name: '时间', data: dates },
    legend: {
      data: ['ours', 'persistence'],
      orient: 'horizontal',
      left: 'center',
      bottom: 5,
    },
  }

  return [
    {
      ...baseOption,
      title: {
        text: `${year}年${month}月 SIC 预测 BACC`,
        left: 'center',
      },
      yAxis: { type: 'value', name: 'BACC(%)' },
      series: [
        { name: 'ours', type: 'line', data: asPercentage(bacc) },
        { name: 'persistence', type: 'line', data: asPercentage(persistenceBacc) },
      ],
    },
    {
      ...baseOption,
      title: {
        text: `${year}年${month}月 SIC 预测 RMSE`,
        left: 'center',
      },
      yAxis: { type: 'value', name: 'RMSE(%)' },
      series: [
        { name: 'ours', type: 'line', data: asPercentage(rmse) },
        { name: 'persistence', type: 'line', data: asPercentage(persistenceRmse) },
      ],
    },
  ]
}

function createBoxOption(data, date) {
  const sources = [
    data?.withoutDA_withoutBC,
    data?.withoutDA_withBC_RMSE,
    data?.withDA_withoutBC_RMSE,
    data?.['MITgcm(with DA)withBC_RMSE'],
  ]
  if (!sources.every(Array.isArray)) {
    throw new Error('Invalid SIC boxplot response')
  }

  return {
    title: {
      text: `${date.getFullYear()}年SIC回报结果误差箱型图`,
      left: 'center',
    },
    dataset: [
      ...sources.map((source) => ({ source: source.map(asPercentage) })),
      ...sources.map((_, index) => ({
        fromDatasetIndex: index,
        transform: { type: 'boxplot' },
      })),
    ],
    legend: { top: '10%' },
    tooltip: { trigger: 'item', axisPointer: { type: 'shadow' } },
    grid: { left: '10%', top: '20%', right: '10%', bottom: '15%' },
    xAxis: {
      type: 'category',
      name: 'Lead time',
      axisLabel: {
        formatter: (value) => `${Number.parseInt(value, 10) + 1}day`,
      },
      boundaryGap: true,
      nameGap: 30,
      splitArea: { show: true },
      splitLine: { show: false },
    },
    yAxis: { type: 'value', name: 'RMSE(%)' },
    series: [
      { name: 'without DA / without BC', type: 'boxplot', datasetIndex: 4 },
      { name: 'without DA / with BC', type: 'boxplot', datasetIndex: 5 },
      { name: 'with DA / without BC', type: 'boxplot', datasetIndex: 6 },
      { name: 'MITgcm (with DA) / with BC', type: 'boxplot', datasetIndex: 7 },
    ],
  }
}

function seasonLabels(year, length) {
  const seasons = ['spring', 'summer', 'fall', 'winter']
  const startYear = year - Math.ceil(length / 4) + 1
  return Array.from({ length }, (_, index) => (
    `${startYear + Math.floor(index / 4)} ${seasons[index % 4]}`
  ))
}

function createSieOptions(data, date) {
  const rmsd = data?.RMSD
  const bias = data?.BAIS
  const variance = data?.VAR
  const correlation = data?.CORRELATION
  const observationStd = data?.OBS_STD
  const predictionStd = data?.PRE_STD
  if (
    ![rmsd, bias, variance, correlation, observationStd, predictionStd]
      .every(Array.isArray)
  ) {
    throw new Error('Invalid SIE error-analysis response')
  }

  const labels = seasonLabels(date.getFullYear(), rmsd.length)
  const xAxis = { type: 'category', data: labels }

  return [
    {
      title: { text: 'SIE预测均方根偏差', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis,
      yAxis: { type: 'value', name: 'RMSD(million km²)' },
      series: [{ name: 'RMSD', type: 'line', data: rmsd }],
    },
    {
      title: { text: 'SIE预测偏差与方差', left: 'center' },
      tooltip: { trigger: 'axis' },
      legend: { data: ['bias', 'variance'], bottom: 5 },
      xAxis,
      yAxis: { type: 'value', name: 'RMSD²(million km²)' },
      series: [
        { name: 'bias', type: 'bar', data: bias },
        { name: 'variance', type: 'bar', data: variance },
      ],
    },
    {
      title: { text: 'SIE预测相关系数', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis,
      yAxis: { type: 'value', name: 'Correlation coefficient' },
      series: [{ name: 'correlation', type: 'line', data: correlation }],
    },
    {
      title: { text: 'SIE观测与预测标准差', left: 'center' },
      tooltip: { trigger: 'axis' },
      legend: { data: ['observation', 'IceTFT'], bottom: 5 },
      xAxis,
      yAxis: { type: 'value', name: 'standard deviation(million km²)' },
      series: [
        { name: 'observation', type: 'line', data: observationStd },
        { name: 'IceTFT', type: 'line', data: predictionStd },
      ],
    },
  ]
}

async function updateChart(index = chartSelected.value) {
  const date = selectedDates.value[index]
  if (!date) return

  const requestId = ++requestIds[index]
  dataLoading.value[index] = true
  dataErrors.value[index] = ''
  tabCharts.value[index] = []

  try {
    let response
    if (index === 0) {
      response = await axios.get('/seaice/error', {
        params: {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
        },
      })
    } else if (index === 1) {
      response = await axios.get('/seaice/errorBox', {
        params: { year: date.getFullYear() },
      })
    } else {
      response = await axios.get('/seaice/predictionExamination/errorAnalysis', {
        params: { year: date.getFullYear() },
      })
    }
    if (requestId !== requestIds[index]) return

    tabCharts.value[index] = index === 0
      ? createLineOptions(response.data, date)
      : index === 1
        ? [createBoxOption(response.data, date)]
        : createSieOptions(response.data, date)
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
  if (availableValues.value[index].length > 0 && tabCharts.value[index].length === 0) {
    await updateChart(index)
  }
}

function handleDateChange() {
  document.activeElement?.blur()
  updateChart()
}

async function retryAvailability() {
  await loadAvailability(chartSelected.value)
  if (selectedTime.value) await updateChart()
}

onMounted(async () => {
  await Promise.all([0, 1, 2].map(loadAvailability))
  if (selectedDates.value[0]) await updateChart(0)
})
</script>

<template>
  <div class="page-content">
    <div class="banner">
      <img :src="bannerImg" alt="">
      <h3 class="page-title">海冰预测结果检验</h3>
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
          :type="chartSelected === 0 ? 'month' : 'year'"
          :clearable="false"
          :disabled="availabilityLoading[chartSelected] || !selectedTime"
          :disabled-date="disabledDate"
          @change="handleDateChange"
        />
      </div>

      <div v-if="availabilityErrors[chartSelected]" class="state-panel">
        <el-alert
          :title="availabilityErrors[chartSelected]"
          type="error"
          :closable="false"
          show-icon
        />
        <el-button type="primary" plain @click="retryAvailability">重试日期加载</el-button>
      </div>

      <div class="description">{{ descriptions[chartSelected] }}</div>
    </section>

    <section
      class="charts-shell"
      :class="{ 'has-state': Boolean(dataErrors[chartSelected]) }"
      v-loading="dataLoading[chartSelected]"
    >
      <div v-if="dataErrors[chartSelected]" class="state-panel">
        <el-alert :title="dataErrors[chartSelected]" type="error" :closable="false" show-icon />
        <el-button type="primary" plain @click="updateChart()">重新加载</el-button>
      </div>

      <template v-else-if="activeCharts.length">
        <div v-for="(option, index) in activeCharts" :key="index" class="chart-container">
          <v-chart class="chart" :option="option" autoresize />
        </div>
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
  overflow-x: auto;
  list-style: none;
  background: white;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
}

.menu li {
  display: flex;
  width: 250px;
  min-width: 250px;
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
.charts-shell {
  margin-right: 10%;
  margin-left: 10%;
}

.charts-shell {
  min-height: 420px;
}

.chart-container {
  min-height: 420px;
  margin-bottom: 24px;
}

.chart {
  width: 100%;
  height: 420px;
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
</style>
