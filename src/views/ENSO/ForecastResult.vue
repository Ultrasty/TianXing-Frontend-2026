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
  <div class="pageContent">
    <div class="banner">
      <img :src="bannerImg" />
      <h3 class="title">ENSO预测结果</h3>
    </div>


    <div class="menu-container">
      <ul class="menu">
        <div :style="movBoxStyle" class="mov-box"></div>
        <li v-for="(chartName, index) of chartNames" :key="chartName" @click="handleClick(chartName, index)"
          :class="{ 'chart-name-selected': chartSelected === index }">
          <p>{{ chartName }}</p>
        </li>
      </ul>
    </div>


    <div style="margin: 0px 10%;">
      <div class="datePickerContainer">
        <el-date-picker @change="update_charts()" v-model="currentDate" type="month" :clearable="false"
          :disabledDate="limitedDateRange" />
      </div>

      <div class="text-container" v-if="chartSelected === 0">
        <p class="text_of_graph">{{ Chart1_Description.text }}</p>
      </div>
      <div>
        <p></p>
      </div>
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
    </div>
  </div>
</template>

<style scoped lang="scss">
.title {
  font-family: 'STXinwei';
  font-weight: 300; //调整字体粗细
  text-align: center;
  font-size: 55px;
  margin-left: 20%;

  letter-spacing: 1px;
  /* 字符间距 */

  z-index: 1;
  /* 确保图片在文字下方 */
  //color:#ffffff;
  color: rgb(251, 236, 222);


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

/*chart1、2 的表和文字*/
.chart {
  height: 400px;
}

.text_of_graph {
  text-align: center;
  font-size: 17px;
}

/* 预报误差页面的容器 没用了*/
// .chart-container {
//   size: 100%
// }



/* 新版添加的代码 =====================================================*/
.banner {
  position: relative;
  height: 420px;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.banner img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% -190px;
  /* 水平居中，垂直向下偏移20px */
  /* 确保图片在文字下方 */
  z-index: 0;
}

.menu-container {
  display: flex;
  //height: 105px;
  height: 85px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: -50px;
}

ul.menu {
  position: relative;
  list-style-type: none;
  height: 100%;
  display: flex;
  padding: 0px;
  flex-direction: row;
  justify-content: center;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.4);

  overflow: hidden;
  /* 新增: 确保伪元素不会超出 ul.menu 边界 */
}

/* 新增: 添加一个伪元素用于整个选项卡区域的上半部分透明或阴影效果 */
ul.menu::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 55%;
  /* 仅覆盖上半部分 */
  background-color: rgba(240, 240, 240, 0.8);
  /* 上半部分透明效果，或更改为 box-shadow 实现阴影效果 */
  z-index: 0;
  /* 确保伪元素在 li 元素下方 */
  pointer-events: none;
  /* 确保透明层不影响鼠标事件 */

}

ul.menu li {
  position: relative;
  display: flex;
  width: 250px;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  /* 更改鼠标形状为手形 */
  overflow: hidden;
  /* 确保伪元素的边界与 li 元素一致 */
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

// ul.menu li:hover::before {
//   content: "";
//   position: absolute;
//   top: 0;
//   left: 0;
//   width: 100%;
//   height: 100%;
//   //background-color: rgba(240, 240, 240, 0.8); /* 浅灰色 */
//   border-radius: 10px; /* 确保形状与选项卡一致 */
//   pointer-events: none; /* 确保伪元素不影响鼠标事件 */
//   z-index: 1; /* 确保覆盖层在文字和内容下方 */
// }

ul.menu li:hover p {
  color: rgb(71, 72, 76);
  z-index: 2;
  /* 确保文字在覆盖层之上 */
}

/* 已经被选中的选项卡在鼠标悬停时字体颜色不变 */
ul.menu li.chart-name-selected:hover p {
  color: inherit; //保持原有颜色
}

.mov-box {
  position: absolute;
  z-index: 3;
  /* 确保滑动条在覆盖层之上 */
}

// .chart-selector {
//   position: relative;
//   //修改为块级
//   display: block;
//   flex-direction: column;
//   justify-content: center;
//   align-items: center;
//   padding: 0px 15%;
// }

.chart-name-selected {
  color: rgb(30, 158, 179)
}


//图表样式
.chart_1 {
  height: 50vh;
  min-height: 400px;
  background-color: white;
  /* 圆角 */
  border-radius: 8px;
  /* 阴影 */
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
  padding-top: 20px;
  padding-bottom: 20px;
}

.pic_container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 60vh;
  overflow: hidden;
  background-color: white;
  /* 圆角 */
  border-radius: 8px;
  /* 阴影 */
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
  padding-top: 20px;
  padding-bottom: 20px;
}

.picture_title {
  text-align: center;
  font-size: 18px;
}

.text-container {
  position: relative;
  margin: 0px auto;
  text-align: center;
  background-color: rgba(239, 242, 252, 0.801);
  /* 淡紫色 */
  //display: flex;
  padding: 4px;
  border-radius: 8px;
  /* 可选的圆角 */
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
  /* 阴影 */
  //font-family: 'sans-serif';

}
</style>