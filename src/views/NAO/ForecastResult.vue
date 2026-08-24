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
          v-for="(chartName, index) of chartNames"
          :key="chartName"
          @click="selectChart(index)"
          :class="{ 'chart-name-selected': chartSelected === index }"
        >
          <p>{{ chartName }}</p>
        </li>
      </ul>
    </div>

    <div style="margin: 0px 10%;">
      <div class="datePickerContainer">
        <el-date-picker
          v-if="selectedNAOI"
          v-model="naoDate"
          type="month"
          :clearable="false"
          :disabled-date="NAOIDisabledDate"
          @change="updateNAOIChart"
        />
        <el-date-picker
          v-if="selectedSLP"
          v-model="slpDate"
          type="month"
          :clearable="false"
          :disabled-date="SLPDisabledDate"
          @change="updateSLPChart"
        />
      </div>

      <div
        class="text-container"
        v-if="chartSelected === 0"
      >
        <div class="description">
          {{ NAOIDescription }}
        </div>
      </div>
    </div>

    <div>
      <p></p>
    </div>

    <div
      class="chart-selector"
      v-if="chartSelected === 0"
    >
      <v-chart
        class="NAOIChart"
        :option="NAOIOption"
        autoresize
      />
    </div>

    <div
      class="chart-selector"
      v-else-if="chartSelected === 1"
    >
      <div class="imgContainer">
        <h3
          v-show="!SLPLoading"
          style="position:relative;text-align:center;margin-top:0;margin-bottom:15px;z-index:1;"
        >
          {{ SLPChartTitle }}
        </h3>

        <h4
          v-if="!SLPLoading && imgSrc.length"
          style="position:relative;text-align:center;margin-top:0;margin-bottom:15px;font-size:16px;z-index:1;"
        >
          ({{ imgIndex + 1 }}/{{ imgSrc.length }})
        </h4>

        <h4
          v-else-if="!SLPLoading"
          style="position:relative;text-align:center;font-size:16px;z-index:1;"
        >
          当前月份暂无模态预测图片
        </h4>

        <img
          v-if="imgSrc.length"
          :src="`${prefix}${imgSrc[imgIndex]}`"
          class="image"
          alt=""
        />
      </div>

      <el-button
        ref="buttonLeft"
        type="primary"
        class="arrowLeft"
        :icon="ArrowLeft"
        :disabled="!imgSrc.length"
        @click="changeIndex('left')"
      />
      <el-button
        ref="buttonRight"
        type="primary"
        class="arrowRight"
        :icon="ArrowRight"
        :disabled="!imgSrc.length"
        @click="changeIndex('right')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import VChart from "vue-echarts";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import bannerImg from "@/assets/nao.jpg";

const prefix = "https://tianxing.tongji.edu.cn";

// ============================================================
// Tab
// ============================================================

const chartSelected = ref(0);
const chartNames = ["指数预测", "模态预测"];

const selectedNAOI = computed(() => chartSelected.value === 0);
const selectedSLP = computed(() => chartSelected.value === 1);

// ============================================================
// 两个 Tab 分别保存自己的日期
// ============================================================

const naoDate = ref(null);
const slpDate = ref(null);

// 后端真正存在数据的月份
const naoAvailableMonths = ref(new Set());
const slpAvailableMonths = ref(new Set());

const NAOISelectedYear = computed(() =>
  naoDate.value ? naoDate.value.getFullYear() : null
);
const NAOISelectedMonth = computed(() =>
  naoDate.value ? naoDate.value.getMonth() + 1 : null
);
const SLPSelectedYear = computed(() =>
  slpDate.value ? slpDate.value.getFullYear() : null
);
const SLPSelectedMonth = computed(() =>
  slpDate.value ? slpDate.value.getMonth() + 1 : null
);

// ============================================================
// 图表与图片状态
// ============================================================

const NAOIChartTitle = ref("");
const SLPChartTitle = ref("");

const NAOIOption = ref({});
const NAOIDescription = ref("");

const NAOILoading = ref(false);
const SLPLoading = ref(false);

const imgSrc = ref([]);
const imgIndex = ref(0);

// ============================================================
// 日期工具
// ============================================================

function dateToMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthKeyToDate(key) {
  if (!key) return null;
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getLatestMonth(monthSet) {
  const months = Array.from(monthSet).sort();
  if (months.length === 0) return null;
  return monthKeyToDate(months[months.length - 1]);
}

// ============================================================
// 精确月份禁用
// ============================================================

function NAOIDisabledDate(day) {
  return !naoAvailableMonths.value.has(dateToMonthKey(day));
}

function SLPDisabledDate(day) {
  return !slpAvailableMonths.value.has(dateToMonthKey(day));
}

// ============================================================
// NAO 指数预测
// ============================================================

function updateNAOIChartTitle() {
  if (!naoDate.value) {
    NAOIChartTitle.value = "";
    return;
  }
  const startYear = NAOISelectedYear.value;
  const startMonth = NAOISelectedMonth.value;
  const endDate = new Date(startYear, startMonth - 1 + 5, 1);
  NAOIChartTitle.value =
    `${startYear}年${startMonth}月~` +
    `${endDate.getFullYear()}年${endDate.getMonth() + 1}月 NAO预测结果`;
}

async function updateNAOIChart() {
  document.activeElement?.blur();
  if (!naoDate.value) {
    NAOIOption.value = {};
    NAOIDescription.value = "当前没有可用的 NAO 指数预测数据";
    return;
  }
  NAOILoading.value = true;
  updateNAOIChartTitle();
  try {
    const params = {
      year: NAOISelectedYear.value,
      month: NAOISelectedMonth.value,
    };
    const response = await axios.get("/nao/predictionResult/nao", { params });
    NAOIOption.value = response.data?.option || {};
    NAOIDescription.value = response.data?.description || "";
  } catch (error) {
    console.error("加载 NAO 指数预测失败", error);
    NAOIOption.value = {};
    NAOIDescription.value = "NAO 指数预测数据加载失败";
  } finally {
    NAOILoading.value = false;
  }
}

// ============================================================
// NAO 模态预测
// ============================================================

function updateSLPChartTitle() {
  if (!slpDate.value) {
    SLPChartTitle.value = "";
    return;
  }
  SLPChartTitle.value =
    `${SLPSelectedYear.value}年${SLPSelectedMonth.value}月 北大西洋SLP预测结果`;
}

async function updateSLPChart() {
  document.activeElement?.blur();
  if (!slpDate.value) {
    imgSrc.value = [];
    imgIndex.value = 0;
    return;
  }
  SLPLoading.value = true;
  updateSLPChartTitle();
  try {
    const params = {
      year: SLPSelectedYear.value,
      month: SLPSelectedMonth.value,
    };
    const response = await axios.get("/nao/findGridData/nao", { params });
    imgSrc.value = Array.isArray(response.data) ? response.data : [];
    imgIndex.value = 0;
    loadImg(imgSrc.value);
  } catch (error) {
    console.error("加载 NAO 模态预测失败", error);
    imgSrc.value = [];
    imgIndex.value = 0;
  } finally {
    SLPLoading.value = false;
  }
}

// ============================================================
// 初始化可用月份
// ============================================================

async function initNAOIChart() {
  try {
    const response = await axios.get("/nao/initialize/naoPrediction");
    const months = response.data?.availableMonths || [];
    naoAvailableMonths.value = new Set(months);
    naoDate.value = getLatestMonth(naoAvailableMonths.value);
  } catch (error) {
    console.error("初始化 NAO 指数预测月份失败", error);
    naoAvailableMonths.value = new Set();
    naoDate.value = null;
  }
}

async function initSLPChart() {
  try {
    const response = await axios.get("/nao/initialize/naoGrid");
    const months = response.data?.availableMonths || [];
    slpAvailableMonths.value = new Set(months);
    slpDate.value = getLatestMonth(slpAvailableMonths.value);
  } catch (error) {
    console.error("初始化 NAO 模态预测月份失败", error);
    slpAvailableMonths.value = new Set();
    slpDate.value = null;
  }
}

// ============================================================
// 图片左右切换
// ============================================================

const buttonLeft = ref(null);
const buttonRight = ref(null);

const changeIndex = (direction) => {
  const total = imgSrc.value.length;
  if (total === 0) return;
  if (direction === "left") {
    imgIndex.value = imgIndex.value === 0 ? total - 1 : imgIndex.value - 1;
    buttonLeft.value?.$el?.blur();
  } else {
    imgIndex.value = imgIndex.value === total - 1 ? 0 : imgIndex.value + 1;
    buttonRight.value?.$el?.blur();
  }
};

// ============================================================
// 图片预加载
// ============================================================

const loadImg = (imgList) => {
  for (const path of imgList) {
    const img = new Image();
    img.src = `${prefix}${path}`;
    img.onload = function () {
      console.log("NAO图片加载完毕", this.currentSrc);
    };
    img.onerror = function () {
      console.log("NAO图片加载失败", this.currentSrc);
    };
  }
};

// ============================================================
// Tab 切换
// ============================================================

async function selectChart(index) {
  chartSelected.value = index;
  if (index === 0) {
    await updateNAOIChart();
  } else {
    await updateSLPChart();
  }
}

// ============================================================
// 移动盒子样式
// ============================================================

const movBoxStyle = computed(() => ({
  left: `${chartSelected.value * 250}px`,
}));

// ============================================================
// 页面初始化
// ============================================================

onMounted(async () => {
  await Promise.all([initNAOIChart(), initSLPChart()]);
  // 默认显示指数预测，只加载指数图
  await updateNAOIChart();
});
</script>

<style scoped lang="scss">
.title {
  font-family: 'STXinwei';
  font-weight: 300;
  text-align: center;
  font-size: 55px;
  margin-left: 20%;
  letter-spacing: 1px;
  z-index: 1;
  color: rgb(19, 24, 36);
}

.NAOIChart {
  height: 500px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
  padding-top: 20px;
  padding-bottom: 20px;
}

.description {
  text-align: center;
  font-size: 17px;
}

.datePickerContainer {
  display: flex;
  justify-content: flex-end;
  position: relative;
  padding: 50px 0 30px;
}

.text {
  margin-left: 5px;
  margin-right: 10px;
}

.imgContainer {
  overflow: hidden;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
  padding-top: 20px;
  padding-bottom: 20px;
}

.image {
  width: 100%;
  margin-top: -7.5%;
  margin-bottom: -5%;
  z-index: 0;
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
  z-index: 0;
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
  height: 85px;
  flex-direction: row;
  justify-content: center;
  margin-top: -50px;
}

.menu {
  position: relative;
  display: flex;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

ul.menu::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 55%;
  background-color: rgba(240, 240, 240, 0.8);
  z-index: 0;
  pointer-events: none;
}

ul.menu li {
  position: relative;
  display: flex;
  width: 250px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  font-size: 17px;
}

ul.menu li:not(:last-child)::after {
  content: "";
  position: absolute;
  right: 0;
  top: 50%;
  width: 2px;
  height: 50%;
  background-color: #00000020;
  transform: translateY(-50%);
}

ul.menu li:hover p {
  color: rgb(71, 72, 76);
  z-index: 2;
}

ul.menu li.chart-name-selected:hover p {
  color: inherit;
}

.mov-box {
  position: absolute;
  bottom: 0;
  width: 125px;
  height: 2px;
  transform: translateX(50%);
  background: rgb(143, 178, 201);
  transition: left 0.3s ease;
  z-index: 3;
}

.chart-name-selected {
  color: rgb(30, 158, 179);
}

.text-container {
  position: relative;
  margin: 0px auto;
  text-align: center;
  background-color: rgba(239, 242, 252, 0.801);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
}

/* 保留全局箭头样式，但不再需要额外覆盖，因为按钮已用了 .arrowLeft / .arrowRight 类，
   且父容器 .chart-selector 设置了 position:relative，箭头可以绝对定位 */
.chart-selector {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0px 10%;
  padding: 0px 0%;
}

.chart-selector .arrowLeft,
.chart-selector .arrowRight {
  position: absolute;
  top: 0;
  width: 7%;
  height: 100%;
  font-size: 50px;
  border: none;
  overflow: hidden;
  border-radius: 0;
  color: rgba(128, 128, 128, 0.4);
  background: transparent;
}

.chart-selector .arrowLeft:hover,
.chart-selector .arrowRight:hover {
  color: white;
  background: transparent;
  border-radius: 0;
}

.chart-selector .arrowLeft {
  left: 0;
}

.chart-selector .arrowLeft:active {
  transform: perspective(600px) rotateY(15deg) scale(0.95);
}

.chart-selector .arrowLeft::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  z-index: 0;
  background: linear-gradient(to left, transparent, rgba(0, 64, 192, 0.3));
  transition: left 0.3s ease;
}

.chart-selector .arrowLeft:hover::before {
  left: 0;
}

.chart-selector .arrowRight {
  right: 0;
}

.chart-selector .arrowRight:active {
  transform: perspective(600px) rotateY(-15deg) scale(0.95);
}

.chart-selector .arrowRight::before {
  content: '';
  position: absolute;
  top: 0;
  right: -100%;
  width: 100%;
  height: 100%;
  z-index: 0;
  background: linear-gradient(to right, transparent, rgba(0, 64, 192, 0.3));
  transition: right 0.3s ease;
}

.chart-selector .arrowRight:hover::before {
  right: 0;
}

/* 日期选择器样式 */
.datePickerContainer .el-input__wrapper {
  position: relative;
  border: none;
  background: transparent;
  border-bottom: 2px solid rgb(173, 216, 230);
  border-radius: 0;
  box-shadow: none;
  transition: all ease 0.3s;
}
.datePickerContainer .el-input__wrapper .el-input__inner {
  font-size: 14px;
  height: 100%;
  margin-left: 0;
  transition: all 0.3s ease;
}
.datePickerContainer .el-input__wrapper::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: rgb(83, 128, 196);
  transition: width 0.3s ease;
}
.datePickerContainer .el-input__wrapper:hover,
.datePickerContainer .el-input__wrapper.is-focus {
  box-shadow: none;
}
.datePickerContainer .el-input__wrapper:hover .el-input__inner,
.datePickerContainer .el-input__wrapper.is-focus .el-input__inner {
  font-size: 19px;
  margin-left: 20px;
}
.datePickerContainer .el-input__wrapper:hover::after,
.datePickerContainer .el-input__wrapper.is-focus::after {
  width: 100%;
}

@media (max-width: 760px) {
  .menu li {
    width: 45vw;
  }
  .page-title {
    margin-left: 8%;
    font-size: 42px;
  }
}
</style>