<script setup>
import { ref, reactive, computed, defineExpose } from "vue";
import * as echarts from "echarts";
import axios from "axios";
import { ElMessage, ElMessageBox } from 'element-plus';
import VChart from 'vue-echarts';
import { ArrowLeft, ArrowRight, Delete } from '@element-plus/icons-vue';
import bannerImg from '@/assets/enso1.jpg';

const prefix = "https://tianxing.tongji.edu.cn";

// ====================== 时间选择器范围框定 START ======================
const start_time = ref(null);
const end_time = ref(null);

// 分别保存原始时间范围
const indexStart = ref(null);
const indexEnd = ref(null);
const modeStart = ref(null);
const modeEnd = ref(null);

// 获取指数预测时间范围
axios.get('/enso/linechart/getInitData')
  .then(res => {
    if (res.data?.earliestDate && res.data?.latestDate) {
      indexStart.value = new Date(res.data.earliestDate.replace(/-/g, '/'));
      indexEnd.value = new Date(res.data.latestDate.replace(/-/g, '/'));
      computeIntersection();
    } else {
      console.warn("获取指数预测时间范围失败", res.data);
    }
  });

// 获取模态预测时间范围
axios.get('/imgs/predictionResult/ssta/getInitData')
  .then(res => {
    if (res.data?.start && res.data?.end) {
      modeStart.value = new Date(res.data.start.replace(/-/g, '/'));
      modeEnd.value = new Date(res.data.end.replace(/-/g, '/'));
      computeIntersection();
    } else {
      console.warn("获取模态预测时间范围失败", res.data);
    }
  });

// 计算交集
function computeIntersection() {
  if (indexStart.value && indexEnd.value && modeStart.value && modeEnd.value) {
    start_time.value = new Date(Math.max(indexStart.value, modeStart.value));
    end_time.value = new Date(Math.min(indexEnd.value, modeEnd.value));
  }
}

// 限制可选日期
const limitedDateRange = (time) => {
  if (!start_time.value || !end_time.value) return true;
  return time.getTime() < start_time.value.getTime() || time.getTime() > end_time.value.getTime();
};

// 切换时只改 tab，不改时间范围
function handleClick(chartName, index) {
  chartSelected.value = index;
  console.log(`切换到 ${chartName}`);
}
// ====================== 时间选择器范围框定 END ======================


// ====================== 时间 & 图表初始值 ======================
const currentDate = ref(new Date(2025, 0));   // 初始日期
const start_year = computed(() => currentDate.value.getFullYear());
const start_month = computed(() => currentDate.value.getMonth() + 1);
const forecastPeriodLabel = computed(() => `${start_year.value}年${String(start_month.value).padStart(2, '0')}月`);

const chart1 = ref({});
const chart1Title = ref('**年*月~**年*月Niño3.4指数结果预测');
let Chart1_Description = reactive({ single: true, text: '此处为预测结果指数预测折线图。' });

var index_heat = 0;
var imgSrc_of_heat_Array;
var title_of_heat_Array;

const imgSrc_of_heat = ref({});
const title_of_heat = ref({});

// ====================== 初始化数据 ======================
// 指数预测
axios.get(`/enso/predictionResult/linechart?year=${start_year.value}&month=${start_month.value}`)
  .then(res => {
    chart1.value = res.data;
  });

// 模态预测（热力图）
axios.get(`/imgs/predictionResult/ssta?year=${start_year.value}&month=${start_month.value}`)
  .then(res => {
    index_heat = 0;
    imgSrc_of_heat_Array = res.data.data;
    imgSrc_of_heat.value = `${prefix}${imgSrc_of_heat_Array[0]}`;
    title_of_heat_Array = res.data.titles;
    title_of_heat.value = title_of_heat_Array[0];
  });

// ====================== 图表更新 ======================
function update_charts() {
  document.activeElement.blur(); // 失焦

  axios.get(`/enso/predictionResult/linechart?year=${start_year.value}&month=${start_month.value}`)
    .then(res => {
      chart1.value = res.data;
    });

  axios.get(`/imgs/predictionResult/ssta?year=${start_year.value}&month=${start_month.value}`)
    .then(res => {
      index_heat = 0;
      imgSrc_of_heat_Array = res.data.data;
      imgSrc_of_heat.value = `${prefix}${imgSrc_of_heat_Array[0]}`;
      title_of_heat_Array = res.data.titles;
      title_of_heat.value = title_of_heat_Array[0];
    });
}

async function deleteForecastResult() {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${forecastPeriodLabel.value} 的预报结果图吗？删除后将无法恢复。`,
      '删除预报结果图',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        draggable: true,
      }
    );

    const payload = {
      year: String(start_year.value),
      month: String(start_month.value),
      day: null,
      type: 'ENSO_ASC',
    };

    const { data } = await axios.post('/admin/forecast-result-images/delete', payload);
    ElMessage.success(data?.message || '预报结果图删除成功');
    await update_charts();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除预报结果图失败', error);
      ElMessage.error(error?.response?.data?.message || '删除预报结果图失败');
    }
  }
}

// ====================== 热力图左右切换 ======================
function change_time_heat(flag) {
  const total = imgSrc_of_heat_Array.length; // 动态总数

  if (flag === "left") {
    index_heat = index_heat > 0 ? index_heat - 1 : total - 1;
  } else if (flag === "right") {
    index_heat = index_heat < total - 1 ? index_heat + 1 : 0;
  }

  imgSrc_of_heat.value = `${prefix}${imgSrc_of_heat_Array[index_heat]}`;
  title_of_heat.value = `${title_of_heat_Array[index_heat]}`;
}



// ====================== tab 样式控制 ======================
const chartSelected = ref(0);
const chartNames = ['指数预测', '模态预测'];

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

      <div class="result-actions" v-if="chartSelected === 0">
        <el-button type="danger" plain :icon="Delete" class="delete-btn" @click="deleteForecastResult">
          删除预报结果图
        </el-button>
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
        <img style="max-height:90%;" :src="imgSrc_of_heat" alt="">
        <el-button ref="buttonLeft" type="primary" class="arrow-left" :icon="ArrowLeft"
          @click="change_time_heat('left')"></el-button>
        <el-button ref="buttonRight" type="primary" class="arrow-right" :icon="ArrowRight"
          @click="change_time_heat('right')"></el-button>
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
  padding: 50px 0 18px;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}

.delete-btn {
  box-shadow: 0px 8px 18px rgba(220, 38, 38, 0.12);
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