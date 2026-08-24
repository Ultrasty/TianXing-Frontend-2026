<script setup>
import { ref, reactive, computed } from "vue";
import axios from "axios";
import VChart from "vue-echarts";
import {
  ArrowLeft,
  ArrowRight
} from "@element-plus/icons-vue";

import bannerImg from "@/assets/enso1.jpg";


const prefix =
  "https://tianxing.tongji.edu.cn";


// ============================================================
// Tab
// ============================================================

const chartSelected = ref(0);

const chartNames = [
  "指数预测",
  "模态预测"
];


// ============================================================
// 两个页面分别保存自己的日期
// ============================================================

// 指数预测当前选择的日期
const indexDate = ref(null);

// 模态预测当前选择的日期
const modeDate = ref(null);


// ============================================================
// 指数预测真正可用的月份
//
// 格式：
// 2022-01
// 2022-03
// ...
// ============================================================

const indexAvailableMonths =
  ref(new Set());


// ============================================================
// 模态预测真正可用的月份
//
// 格式：
// 2025-01
// 2025-02
// ...
// ============================================================

const modeAvailableMonths =
  ref(new Set());


// ============================================================
// DatePicker 实际绑定值
//
// 指数预测：绑定 indexDate
// 模态预测：绑定 modeDate
// ============================================================

const currentDate = computed({

  get() {

    if (chartSelected.value === 0) {
      return indexDate.value;
    }

    return modeDate.value;
  },

  set(value) {

    if (chartSelected.value === 0) {
      indexDate.value = value;
    } else {
      modeDate.value = value;
    }

  }

});


// ============================================================
// 日期工具
// ============================================================

/**
 * Date 转换为 yyyy-MM
 */
function dateToMonthKey(date) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  return `${year}-${month}`;
}


/**
 * yyyy-MM 转换为 Date
 */
function monthKeyToDate(key) {

  if (!key) {
    return null;
  }

  const [year, month] =
    key.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    1
  );
}


/**
 * 从可用月份中取得最新月份
 */
function getLatestMonth(monthSet) {

  const months =
    Array.from(monthSet).sort();

  if (months.length === 0) {
    return null;
  }

  return monthKeyToDate(
    months[months.length - 1]
  );
}


// ============================================================
// 日期禁用规则
// ============================================================

const limitedDateRange = (time) => {

  const key =
    dateToMonthKey(time);

  // 指数预测：只允许后端实际存在指数数据的月份
  if (chartSelected.value === 0) {
    return !indexAvailableMonths.value.has(key);
  }

  // 模态预测：只允许后端实际存在模态图片的月份
  return !modeAvailableMonths.value.has(key);
};


// ============================================================
// 指数预测图
// ============================================================

const chart1 = ref({});

const chart1Title = ref(
  "**年*月~**年*月Niño3.4指数结果预测"
);

const Chart1_Description =
  reactive({
    single: true,
    text: "此处为预测结果指数预测折线图。"
  });


// ============================================================
// 加载指数预测
// ============================================================

async function loadIndexChart() {

  if (!indexDate.value) {

    chart1.value = {};

    return;
  }

  const year =
    indexDate.value.getFullYear();

  const month =
    indexDate.value.getMonth() + 1;

  try {

    const res =
      await axios.get(
        `/enso/predictionResult/linechart?year=${year}&month=${month}`
      );

    chart1.value =
      res.data;

  } catch (error) {

    console.error(
      "加载 ENSO 指数预测失败",
      error
    );

    chart1.value = {};
  }
}

function handleDateChange() {
  document.activeElement?.blur()
  loadActiveData()
}

// ============================================================
// 模态预测
// ============================================================

let index_heat = 0;

let imgSrc_of_heat_Array = [];
let title_of_heat_Array = [];

const imgSrc_of_heat =
  ref("");

const title_of_heat =
  ref("");


// ============================================================
// 加载模态预测
// ============================================================

async function loadModeChart() {

  if (!modeDate.value) {

    imgSrc_of_heat_Array = [];
    title_of_heat_Array = [];

    imgSrc_of_heat.value = "";
    title_of_heat.value = "";

    return;
  }

  const year =
    modeDate.value.getFullYear();

  const month =
    modeDate.value.getMonth() + 1;

  try {

    const res =
      await axios.get(
        `/imgs/predictionResult/ssta?year=${year}&month=${month}`
      );

    index_heat = 0;

    imgSrc_of_heat_Array =
      res.data?.data || [];

    title_of_heat_Array =
      res.data?.titles || [];


    if (
      imgSrc_of_heat_Array.length > 0
    ) {

      imgSrc_of_heat.value =
        `${prefix}${imgSrc_of_heat_Array[0]}`;

      title_of_heat.value =
        title_of_heat_Array[0] || "";

    } else {

      imgSrc_of_heat.value = "";

      title_of_heat.value =
        "当前月份暂无模态预测数据";
    }

  } catch (error) {

    console.error(
      "加载 ENSO 模态预测失败",
      error
    );

    imgSrc_of_heat_Array = [];
    title_of_heat_Array = [];

    imgSrc_of_heat.value = "";

    title_of_heat.value =
      "模态预测数据加载失败";
  }
}


// ============================================================
// 获取指数预测可用月份
// ============================================================

async function loadIndexAvailableMonths() {

  try {

    const res =
      await axios.get(
        "/enso/linechart/getInitData"
      );

    const months =
      res.data?.availableMonths || [];

    indexAvailableMonths.value =
      new Set(months);


    // 默认选择最新一个真正有数据的月份
    indexDate.value =
      getLatestMonth(
        indexAvailableMonths.value
      );

  } catch (error) {

    console.error(
      "获取指数预测可用月份失败",
      error
    );

    indexAvailableMonths.value =
      new Set();

    indexDate.value =
      null;
  }
}


// ============================================================
// 获取模态预测可用月份
// ============================================================

async function loadModeAvailableMonths() {

  try {

    const res =
      await axios.get(
        "/imgs/predictionResult/ssta/getInitData"
      );

    const months =
      res.data?.availableMonths || [];

    modeAvailableMonths.value =
      new Set(months);

    // 默认选择模态预测最新一个真正有图片的月份
    modeDate.value =
      getLatestMonth(
        modeAvailableMonths.value
      );

  } catch (error) {

    console.error(
      "获取模态预测可用月份失败",
      error
    );

    modeAvailableMonths.value =
      new Set();

    modeDate.value =
      null;
  }
}


// ============================================================
// 用户修改月份
// ============================================================

async function update_charts() {

  document.activeElement?.blur();


  // ----------------------------------------------------------
  // 重点：
  // 当前看什么，只请求什么。
  //
  // 不再像旧代码一样每次同时请求指数和模态。
  // ----------------------------------------------------------

  if (chartSelected.value === 0) {

    await loadIndexChart();

  } else {

    await loadModeChart();
  }
}


// ============================================================
// 切换 Tab
// ============================================================

async function handleClick(
  chartName,
  index
) {

  chartSelected.value =
    index;

  console.log(
    `切换到 ${chartName}`
  );


  // 切到指数
  if (index === 0) {

    await loadIndexChart();

  }

  // 切到模态
  else {

    await loadModeChart();
  }
}


// ============================================================
// 模态图片左右切换
// ============================================================

function change_time_heat(flag) {

  const total =
    imgSrc_of_heat_Array.length;


  // 没有图片时直接退出
  if (total === 0) {
    return;
  }


  if (flag === "left") {

    index_heat =
      index_heat > 0
        ? index_heat - 1
        : total - 1;

  }

  else if (flag === "right") {

    index_heat =
      index_heat < total - 1
        ? index_heat + 1
        : 0;
  }


  imgSrc_of_heat.value =
    `${prefix}${imgSrc_of_heat_Array[index_heat]}`;

  title_of_heat.value =
    title_of_heat_Array[index_heat] || "";
}


// ============================================================
// Tab 样式
// ============================================================

const moveBoxLeft =
  computed(
    () =>
      chartSelected.value * 250
  );


const movBoxStyle =
  computed(() => ({

    position: "absolute",

    bottom: "0px",

    left:
      `${moveBoxLeft.value}px`,

    height: "2px",

    width: "125px",

    transform:
      "translateX(50%)",

    backgroundColor:
      "rgb(143,178,201)",

    transition:
      "left 0.3s ease"

  }));


// ============================================================
// 页面初始化
// ============================================================

async function initPage() {

  /*
   * 两套时间信息互相独立。
   */
  await Promise.all([
    loadIndexAvailableMonths(),
    loadModeAvailableMonths()
  ]);


  /*
   * 页面默认显示指数预测，
   * 所以初始化只加载指数图。
   */
  await loadIndexChart();
}


initPage();

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

      <div v-if="rangeErrors[chartSelected]" class="state-panel">
        <el-alert :title="rangeErrors[chartSelected]" type="error" :closable="false" show-icon />
        <el-button type="primary" plain @click="retryRange">重试日期加载</el-button>
      </div>

    <div class="chart-selector" v-if="chartSelected === 0">
      <v-chart class="chart_1" :option="chart1" autoresize> </v-chart>
    </div>

    <!-- 这里的chart-selector为全局样式，不用在本文件中添加 -->
    <div class="chart-selector" v-else-if="chartSelected === 1">
      <div class="pic_container">
        <p class="picture_title">
          {{ title_of_heat }}
        </p>
        <img v-if="imgSrc_of_heat" style="max-height:90%;" :src="imgSrc_of_heat" alt="">
        <el-button ref="buttonLeft" type="primary" class="arrow-left" :icon="ArrowLeft"
          :disabled="!imgSrc_of_heat_Array.length" @click="change_time_heat('left')"></el-button>
        <el-button ref="buttonRight" type="primary" class="arrow-right" :icon="ArrowRight"
          :disabled="!imgSrc_of_heat_Array.length" @click="change_time_heat('right')"></el-button>
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
  padding: 50px 0 30px;
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
