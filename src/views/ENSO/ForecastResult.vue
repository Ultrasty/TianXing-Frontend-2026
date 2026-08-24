<script setup>
import { ref, reactive, computed } from "vue";
import axios from "axios";
import VChart from "vue-echarts";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import bannerImg from "@/assets/enso1.jpg";

const prefix = "https://tianxing.tongji.edu.cn";

// Tab
const chartSelected = ref(0);
const chartNames = ["指数预测", "模态预测"];

// 两个页面分别保存自己的日期
const indexDate = ref(null);
const modeDate = ref(null);

// 可用月份集合
const indexAvailableMonths = ref(new Set());
const modeAvailableMonths = ref(new Set());

// DatePicker 绑定值（根据当前 Tab 切换）
const currentDate = computed({
  get() {
    return chartSelected.value === 0 ? indexDate.value : modeDate.value;
  },
  set(value) {
    if (chartSelected.value === 0) {
      indexDate.value = value;
    } else {
      modeDate.value = value;
    }
  }
});

// 日期工具
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

// 日期禁用规则
const limitedDateRange = (time) => {
  const key = dateToMonthKey(time);
  if (chartSelected.value === 0) {
    return !indexAvailableMonths.value.has(key);
  }
  return !modeAvailableMonths.value.has(key);
};

// 指数预测
const chart1 = ref({});
const chart1Title = ref("**年*月~**年*月Niño3.4指数结果预测");
const Chart1_Description = reactive({
  single: true,
  text: "此处为预测结果指数预测折线图。"
});

async function loadIndexChart() {
  if (!indexDate.value) {
    chart1.value = {};
    return;
  }
  const year = indexDate.value.getFullYear();
  const month = indexDate.value.getMonth() + 1;
  try {
    const res = await axios.get(`/enso/predictionResult/linechart?year=${year}&month=${month}`);
    chart1.value = res.data;
  } catch (error) {
    console.error("加载 ENSO 指数预测失败", error);
    chart1.value = {};
  }
}

function handleDateChange() {
  document.activeElement?.blur();
  if (chartSelected.value === 0) {
    loadIndexChart();
  } else {
    loadModeChart();
  }
}

// 模态预测
let index_heat = 0;
let imgSrc_of_heat_Array = [];
let title_of_heat_Array = [];
const imgSrc_of_heat = ref("");
const title_of_heat = ref("");

async function loadModeChart() {
  if (!modeDate.value) {
    imgSrc_of_heat_Array = [];
    title_of_heat_Array = [];
    imgSrc_of_heat.value = "";
    title_of_heat.value = "";
    return;
  }
  const year = modeDate.value.getFullYear();
  const month = modeDate.value.getMonth() + 1;
  try {
    const res = await axios.get(`/imgs/predictionResult/ssta?year=${year}&month=${month}`);
    index_heat = 0;
    imgSrc_of_heat_Array = res.data?.data || [];
    title_of_heat_Array = res.data?.titles || [];
    if (imgSrc_of_heat_Array.length > 0) {
      imgSrc_of_heat.value = `${prefix}${imgSrc_of_heat_Array[0]}`;
      title_of_heat.value = title_of_heat_Array[0] || "";
    } else {
      imgSrc_of_heat.value = "";
      title_of_heat.value = "当前月份暂无模态预测数据";
    }
  } catch (error) {
    console.error("加载 ENSO 模态预测失败", error);
    imgSrc_of_heat_Array = [];
    title_of_heat_Array = [];
    imgSrc_of_heat.value = "";
    title_of_heat.value = "模态预测数据加载失败";
  }
}

// 获取可用月份
async function loadIndexAvailableMonths() {
  try {
    const res = await axios.get("/enso/linechart/getInitData");
    const months = res.data?.availableMonths || [];
    indexAvailableMonths.value = new Set(months);
    indexDate.value = getLatestMonth(indexAvailableMonths.value);
  } catch (error) {
    console.error("获取指数预测可用月份失败", error);
    indexAvailableMonths.value = new Set();
    indexDate.value = null;
  }
}

async function loadModeAvailableMonths() {
  try {
    const res = await axios.get("/imgs/predictionResult/ssta/getInitData");
    const months = res.data?.availableMonths || [];
    modeAvailableMonths.value = new Set(months);
    modeDate.value = getLatestMonth(modeAvailableMonths.value);
  } catch (error) {
    console.error("获取模态预测可用月份失败", error);
    modeAvailableMonths.value = new Set();
    modeDate.value = null;
  }
}

// 切换 Tab
async function selectChart(index) {
  chartSelected.value = index;
  if (index === 0) {
    await loadIndexChart();
  } else {
    await loadModeChart();
  }
}

// 模态图片左右切换
function change_time_heat(flag) {
  const total = imgSrc_of_heat_Array.length;
  if (total === 0) return;
  if (flag === "left") {
    index_heat = index_heat > 0 ? index_heat - 1 : total - 1;
  } else {
    index_heat = index_heat < total - 1 ? index_heat + 1 : 0;
  }
  imgSrc_of_heat.value = `${prefix}${imgSrc_of_heat_Array[index_heat]}`;
  title_of_heat.value = title_of_heat_Array[index_heat] || "";
}

// Tab 样式
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

// 页面初始化
async function initPage() {
  await Promise.all([loadIndexAvailableMonths(), loadModeAvailableMonths()]);
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

    <!-- 日期选择器 -->
    <section class="content-shell">
      <div class="date-picker-container">
        <el-date-picker
          v-model="currentDate"
          type="month"
          :clearable="false"
          :disabled-date="limitedDateRange"
          @change="handleDateChange"
        />
      </div>
    </section>

    <!-- 图表展示 -->
    <div class="chart-wrapper">
      <!-- 指数预测 -->
      <div v-if="chartSelected === 0" class="chart-selector">
        <v-chart class="chart" :option="chart1" autoresize />
      </div>

      <!-- 模态预测 -->
      <div v-else class="chart-selector">
        <div class="pic_container">
          <p class="picture_title">{{ title_of_heat }}</p>
          <img v-if="imgSrc_of_heat" style="max-height:90%;" :src="imgSrc_of_heat" alt="">
          <el-button
            ref="buttonLeft"
            type="primary"
            class="arrow-left"
            :icon="ArrowLeft"
            :disabled="!imgSrc_of_heat_Array.length"
            @click="change_time_heat('left')"
          />
          <el-button
            ref="buttonRight"
            type="primary"
            class="arrow-right"
            :icon="ArrowRight"
            :disabled="!imgSrc_of_heat_Array.length"
            @click="change_time_heat('right')"
          />
        </div>
      </div>
    </div>
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
.chart-wrapper {
  margin: 0 10%;
}
.content-shell .date-picker-container {
  display: flex;
  justify-content: flex-end;
  padding: 50px 0 30px;
}

.chart-wrapper {
  min-height: 430px;
  margin-top: 28px;
  margin-bottom: 40px;
}
.chart-selector {
  min-height: 430px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px 1.5px rgba(199, 198, 198, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.chart {
  height: 50vh;
  min-height: 430px;
  width: 100%;
  padding: 20px 0;
}

.pic_container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}
.picture_title {
  margin: 0 0 6px;
  font-size: 18px;
}
.pic_container img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.arrow-left,
.arrow-right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 7%;
  height: 60%;
  font-size: 50px;
  border: none;
  overflow: hidden;
  border-radius: 0;
  color: rgba(128, 128, 128, 0.4);
  background: transparent;
}
.arrow-left:hover,
.arrow-right:hover {
  color: white;
  background: transparent;
}
.arrow-left {
  left: 0;
}
.arrow-left:active {
  transform: perspective(600px) rotateY(15deg) scale(0.95);
}
.arrow-left::before {
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
.arrow-left:hover::before {
  left: 0;
}
.arrow-right {
  right: 0;
}
.arrow-right:active {
  transform: perspective(600px) rotateY(-15deg) scale(0.95);
}
.arrow-right::before {
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
.arrow-right:hover::before {
  right: 0;
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
  .chart-wrapper {
    margin-right: 4%;
    margin-left: 4%;
  }
}
</style>