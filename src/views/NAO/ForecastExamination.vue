<script setup>
import { ref, onMounted, reactive, watch, defineExpose, computed } from "vue";
import * as echarts from "echarts";
import axios from "axios";
import VChart from 'vue-echarts';
import { nextTick } from "vue";
import { configProviderContextKey } from "element-plus";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import bannerImg from '@/assets/nao.jpg';//首页图

const prefix = "https://tianxing.tongji.edu.cn"

// 新加入
const chartSelected = ref(0);
const chartNames = ['指数预测', '模态预测', '评估指标'];

//时间选择器范围框定--start
const start_year = ref(null);
const start_month = ref(null);
const end_year = ref(null);
const end_month = ref(null);

const selectedDateTime = ref(new Date('2015-1'));
const selectedYear = computed(() => {
  return selectedDateTime.value.getFullYear();
})
const selectedMonth = computed(() => {
  return selectedDateTime.value.getMonth() + 1;
})

axios.get('/nao/initialize/naoCORR')
  .then(res => {
    start_year.value = res.data.start_year;
    start_month.value = new Date(res.data.start_month);
    end_year.value = res.data.end_year;
    end_month.value = new Date(res.data.end_month);
    //console.log(res.data);
  })
  .catch(error => {
    console.error(error);
  });

const limitedDateRange = (time) => {
  return time.getFullYear() < start_year.value || time.getFullYear() > end_year.value;
};

const text_of_option1 = ref('预测误差主要来自于对中纬度和冰岛附近低压的高估，能够预测出NAO的典型两级模态 ，模拟误差随着预测时长逐渐增加。')//表示前六个图底下的文字描述
const text_of_option7 = ref('对于为期1个月的NAOI预测，不如高分辨率模式ECMWF ，但与低分辨率模式ECCC相当。由于只接受月平均数作为输入，忽略了决定短时尺度可预测性的天气现象和初始条件。在超过两个月的提前期的预测技巧远远超过了失去预测能力的数值模式，将NAO的有效预测时间从1个月扩展到了6个月。')

var index_nao = 0; //切换气温预测时修改这个索引
var imgSrc_of_nao_Array;
var title_of_nao_Array;
const imgSrc_of_nao = ref({})
const title_of_nao = ref({})

const option7 = ref({})

// 评估指标相关
const optionEvaluation = ref({});
const evaluationDescription = ref('NAO预测评估指标（相关系数/均方根误差等）趋势');

function loadEvaluationData() {
  // 待后端接口就绪

  // 模拟数据
  const mockYears = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];
  const mockValues = [0.72, 0.68, 0.74, 0.80, 0.77, 0.82, 0.79, 0.85, 0.88, 0.83];
  const option = {
    title: { text: 'NAO预测相关系数（逐年起报）', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: mockYears, name: '起报年份' },
    yAxis: { type: 'value', min: 0, max: 1, name: '相关系数' },
    series: [
      {
        type: 'line',
        data: mockValues,
        smooth: true,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.1 }
      }
    ]
  };
  optionEvaluation.value = option;
}

function updateChartTitle() {
  //使元素失焦
  document.activeElement.blur();

  axios.get('/nao/predictionExamination/nao?year=' + Number(selectedYear.value) + '&month=' + Number(selectedMonth.value))
    .then(res => {
      index_nao = 0;
      console.log("点击标签,更新nao", res.data);
      imgSrc_of_nao_Array = res.data;
      imgSrc_of_nao.value = `${prefix}${imgSrc_of_nao_Array[0]}`;
      //console.log("wwwww",imgSrc_of_nao_Array[0]);
    })
    .catch(error => {
      console.error(error);
    });

  axios.get('/nao/predictionExamination/naoi')
    .then(res => {
      console.log("更新naoi", res.data);
      // title_of_option1.value='提前1个月预测';
      // list = res.data.imgSrc;
      option7.value = res.data;
    })
    .catch(error => {
      console.error(error);
    });

  if (chartSelected.value === 2) {
    loadEvaluationData();
  }
}

//////////以下两个是初始化
axios.get('/nao/predictionExamination/nao?year=' + Number(selectedYear.value) + '&month=' + Number(selectedMonth.value))
  .then(res => {
    index_nao = 0;
    console.log("初始化nao", res.data);
    imgSrc_of_nao_Array = res.data;
    imgSrc_of_nao.value = `${prefix}${imgSrc_of_nao_Array[0]}`;
    //console.log("swwwww",imgSrc_of_nao_Array[0]);
  });

axios.get('/nao/predictionExamination/naoi')
  .then(res => {
    console.log("初始化naoi", res.data);
    // title_of_option1.value='提前1个月预测';
    // list = res.data.imgSrc;
    option7.value = res.data;
  });

function change_time_nao(flag) {
  if (flag === "left") {
    if (index_nao > 0) {
      index_nao--;
    }
    else {
      index_nao = 5;
    }
  }
  else if (flag === "right") {
    if (index_nao < 5) {
      index_nao++;
    }
    else {
      index_nao = 0;
    }
  }
  title_of_nao.value = title_of_nao_Array[index_nao];
  imgSrc_of_nao.value = `${prefix}${imgSrc_of_nao_Array[index_nao]}`;
  //text_of_temperature.value=text_of_temperature_Array[index_tempe];
}

function selectChart(index) {
  chartSelected.value = index;
  if (index === 2) {
    loadEvaluationData();
  }
}

const moveBoxLeft = computed(() => {
  return chartSelected.value * 250;
});

const movBoxStyle = computed(() => ({
  position: "absolute",
  bottom: "0px",
  left: `${moveBoxLeft.value}px`,
  height: "2px",
  width: "125px",
  transform: "translateX(50%)",
  //backgroundColor: "blue",
  backgroundColor: "rgb(143,178,201)",
  //backgroundColor: "rgb(92,179,204)",
  transition: "left 0.3s ease"
}));

// 状态管理（图片加载、错误处理）
const loading = ref({ 0: false, 1: false, 2: false });
const errors = ref({ 0: null, 1: null, 2: null });

const modalImages = ref([]);
const modalImageIndex = ref(0);
const currentModalImage = computed(() => {
  return modalImages.value[modalImageIndex.value] || '';
});
const modalTitle = ref('');

const changeImageIndex = (direction) => {
  const len = modalImages.value.length;
  if (len < 2) return;
  if (direction === 'left') {
    modalImageIndex.value = (modalImageIndex.value - 1 + len) % len;
  } else {
    modalImageIndex.value = (modalImageIndex.value + 1) % len;
  }
};

const retryActive = () => {
  if (chartSelected.value === 0) {
    axios.get('/nao/predictionExamination/nao?year=' + Number(selectedYear.value) + '&month=' + Number(selectedMonth.value))
      .then(res => {
        modalImages.value = res.data.map(src => `${prefix}${src}`);
        modalImageIndex.value = 0;
        errors.value[0] = null;
        loading.value[0] = false;
      })
      .catch(err => {
        errors.value[0] = '加载图片失败，请稍后重试';
        loading.value[0] = false;
      });
  } else if (chartSelected.value === 1) {
    axios.get('/nao/predictionExamination/naoi')
      .then(res => {
        option7.value = res.data;
        errors.value[1] = null;
        loading.value[1] = false;
      })
      .catch(err => {
        errors.value[1] = '加载模态预测数据失败，请稍后重试';
        loading.value[1] = false;
      });
  } else if (chartSelected.value === 2) {
    loadEvaluationData();
    errors.value[2] = null;
    loading.value[2] = false;
  }
};

// 初始化数据
const initImageData = () => {
  loading.value[0] = true;
  axios.get('/nao/predictionExamination/nao?year=' + Number(selectedYear.value) + '&month=' + Number(selectedMonth.value))
    .then(res => {
      imgSrc_of_nao_Array = res.data;
      modalImages.value = res.data.map(src => `${prefix}${src}`);
      modalImageIndex.value = 0;
      errors.value[0] = null;
      loading.value[0] = false;
    })
    .catch(err => {
      errors.value[0] = '加载图片失败，请稍后重试';
      loading.value[0] = false;
    });
};

const initModalData = () => {
  loading.value[1] = true;
  axios.get('/nao/predictionExamination/naoi')
    .then(res => {
      option7.value = res.data;
      errors.value[1] = null;
      loading.value[1] = false;
    })
    .catch(err => {
      errors.value[1] = '加载模态预测数据失败，请稍后重试';
      loading.value[1] = false;
    });
};

onMounted(() => {
  initImageData();
  initModalData();
  loadEvaluationData();
});
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

    <div style="margin: 0px 10%;">
      <div class="datePickerContainer" v-if="chartSelected !== 1">
        <el-date-picker @change="updateChartTitle()" v-model="selectedDateTime" type="month" :clearable="false"
          :disabledDate="limitedDateRange" />
      </div>
      <div v-else class="date-independent-note">
        该指标为固定的提前期相关系数，不随起报日期变化。
      </div>

      <div class="text-container" v-if="chartSelected === 0">
        <div class="description">
          {{ text_of_option1 }}
        </div>
      </div>
      <div class="text-container" v-if="chartSelected === 1">
        <div class="description1">
          {{ text_of_option7 }}
        </div>
      </div>
      <div class="text-container" v-if="chartSelected === 2">
        <div class="description1">
          {{ evaluationDescription }}
          <span style="font-size:14px; color:#888; display:block; margin-top:5px;">
            （当前展示模拟数据，实际数据待后端接口 `/nao/evaluation` 就绪后自动替换）
          </span>
        </div>
      </div>
    </div>

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
        <h2>{{ modalTitle || `${selectedYear}年${selectedMonth}月 预测结果分布误差图` }}</h2>
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

      <div v-else-if="chartSelected === 1">
        <h2 class="chart-title">NAOI指数预测的相关系数</h2>
        <div class="chart">
          <v-chart :option="option7" autoresize></v-chart>
        </div>
      </div>

      <div v-else-if="chartSelected === 2">
        <h2 class="chart-title">NAO评估指标趋势</h2>
        <div class="chart">
          <v-chart :option="optionEvaluation" autoresize></v-chart>
        </div>
      </div>
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

.datePickerContainer,
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
  padding: 20px clamp(88px, 12%, 160px);
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

  .picture-container {
    padding-right: 56px;
    padding-left: 56px;
  }
}
</style>