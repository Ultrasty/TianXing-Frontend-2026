<script setup>
import { ref, onMounted, computed, watch } from "vue";
import axios from 'axios';
//import request from '@/utils/request';//项目已提供 src/utils/request.ts 工具，它会自动应用环境变量中的API前缀。byCP
import VChart from 'vue-echarts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, ArrowRight, Delete } from '@element-plus/icons-vue';
import bannerImg from '@/assets/Ice.jpg';

const selectedSIE = ref(true);
const selectedSIC = ref(false);

const selectedTime = ref(new Date('2023-01'));

const selectedYear = computed(() => {
  return selectedTime.value.getFullYear();
})
const selectedMonth = computed(() => {
  return selectedTime.value.getMonth() + 1;
})
const selectedDay = computed(() => { return selectedTime.value; });

const SIEAvailableList = ref([]);
const SICAvailableList = ref({
  yearList: [],
  monthList: [],
  dateList: []
});

const SIEChartTitle = ref('');
const SICChartTitle = ref('');

const SIEOption = ref({});
const SIEDescription = ref('');

const imgSrc = ref([]);
const imgIndex = ref(0);

const SIELoading = ref(false);
const SICLoading = ref(false);

const chartSelected = ref(0);
const chartNames = ['SIE指数', 'SIC模态'];

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

watch(selectedTime, (newValue, oldValue) => {
  if (newValue !== oldValue && selectedSIE.value) {
    updateSIEChart();
  }
  if (newValue !== oldValue && selectedSIC.value) {
    updateSICChart();
  }
});


function selectChart(index) {
  chartSelected.value = index;
  selectedSIE.value = index === 0;
  selectedSIC.value = index === 1;
  if (selectedSIE.value) {
    // 从SIC切换到SIE时，设置默认时间为2025年7月
    selectedTime.value = new Date(2025, 6); // 2025年7月（月份从0开始，所以6代表7月）
    updateSIEChart();
  } else {
    // 选取可用时间
    let newestYear = Math.max(...SICAvailableList.value.yearList);
    let newestMonth = Math.max(...SICAvailableList.value.monthList);
    let newestDate = Math.max(...SICAvailableList.value.dateList);
    selectedTime.value = new Date(newestYear, newestMonth - 1, newestDate);
    updateSICChart();
  }
}

// 请求SIE数据
// 该函数定义已在文件下方存在，此处应删除该不完整定义，让文件使用完整的函数定义
  // SIELoading.value = true;
  // updateSIEChartTitle();
  // const params = {
  //   year: Number(selectedYear.value),
  //   month: Number(selectedMonth.value)
  // };
  
  // axios.get('/seaice/initial/SIEprediction', { params })
  //   .then(response => {
  //     SIEOption.value = response.data.option;
  //     SIEDescription.value = response.data.description;
  //     SIELoading.value = false;
  //   })
  //   .catch(error => {
  //     console.error(error);
  //     SIELoading.value = false;
  //   });


// 请求SIC数据
const updateSICChart = async () => {
  //使元素失焦
  document.activeElement.blur();

  SICLoading.value = true;
  updateSICChartTitle();
  const params = {
    year: selectedDay.value.getFullYear(),
    month: selectedDay.value.getMonth() + 1,
    day: selectedDay.value.getDate()
  };
  axios.get('/seaice/predictionResult/SIC', { params })
    .then(response => {
      imgSrc.value = response.data;
      imgIndex.value = 0;
      loadImg(imgSrc.value);
      SICLoading.value = false;
    })
    .catch(error => {
      console.error(error);
      SICLoading.value = false;
    });
}

// 初始化SIE可请求的年月
const initSIEAvailableList = () => {
  updateSIEChartTitle();
  SIELoading.value = true;

  // 使用相对路径，避免与request.get方法默认添加的前缀重复
  const apiUrl = '/seaice/initial/SIEprediction'; // 修改为初始化接口
  console.log('请求API:', apiUrl);

  axios.get(apiUrl)
    .then(response => {
      console.log('API响应状态:', response.status);
      console.log('API响应头:', response.headers);
      console.log('API响应数据:', response.data);

      if (response.data) {
        // 检查是否包含yearList和monthList属性
        if (Array.isArray(response.data.yearList) && Array.isArray(response.data.monthList)) {
          // 构建SIEAvailableList
          SIEAvailableList.value = [];
          response.data.yearList.forEach(year => {
            response.data.monthList.forEach(month => {
              SIEAvailableList.value.push({ year, month });
            });
          });

          // 设置默认年月
          if (response.data.defaultYear && response.data.defaultMonth) {
            selectedTime.value = new Date(response.data.defaultYear, response.data.defaultMonth - 1);
            //初始化时手动调用一次updateSIEChart
            updateSIEChart();
          }

          // 如果有初始数据，加载图表
          if (response.data.sieInitial) {
            const modelData = {
              prediction: response.data.sieInitial.find(item => item.var_model === 'prediction_IceTFT')?.trans_data || [],
              mean: response.data.sieInitial.find(item => item.var_model === 'mean_IceTFT')?.trans_data || [],
              upper: response.data.sieInitial.find(item => item.var_model === 'upper_IceTFT')?.trans_data || [],
              lower: response.data.sieInitial.find(item => item.var_model === 'lower_IceTFT')?.trans_data || []
            };
            SIEOption.value = buildSIEChartOption(modelData);
            SIEDescription.value = `${response.data.defaultYear}年${response.data.defaultMonth}月预测数据`;
          }
        } else {
          console.warn('API返回的yearList或monthList不是数组');
          SIEAvailableList.value = [];
          // 提供模拟数据
          provideMockData();
        }
      } else {
        console.warn('API返回数据为空');
        // 尝试提供模拟数据进行测试
        provideMockData();
      }
      SIELoading.value = false;
    })
    .catch(error => {
      console.error('请求出错:', error.message);
      console.error('错误详情:', error);

      // 分析常见错误类型
      if (error.message.includes('Network Error')) {
        console.error('网络错误: 无法连接到API服务器');
      } else if (error.message.includes('404')) {
        console.error('404错误: API端点不存在');
      } else if (error.message.includes('403')) {
        console.error('403错误: 没有访问权限');
      }

      // 提供模拟数据进行测试
      provideMockData();
      SIELoading.value = false;
    });
}


// 根据年月和模型查询SIE指数预测结果
const getSIEByModel = (varModel) => {
  SIELoading.value = true;
  const params = {
    year: selectedYear.value.toString(),
    month: selectedMonth.value.toString(),
    var_model: varModel
  };

  axios.get('/seaice/findByModelandTime/SIE', { params })
    .then(response => {
      console.log('指定模型的SIE预测结果:', response.data);
      // 这里可以添加处理单一模型数据的逻辑
      SIELoading.value = false;
    })
    .catch(error => {
      console.error('获取指定模型SIE预测结果失败:', error);
      SIELoading.value = false;
    });
}

// 查询全部SIE指数
const getAllSIEData = () => {
  SIELoading.value = true;

  axios.get('/seaice/findAll/SIE')
    .then(response => {
      console.log('全部SIE指数数据:', response.data);
      // 这里可以添加处理全部数据的逻辑
      SIELoading.value = false;
    })
    .catch(error => {
      console.error('获取全部SIE指数失败:', error);
      SIELoading.value = false;
    });
}

// 查询SIE预测误差分析数据
const getSIEErrorAnalysis = () => {
  SIELoading.value = true;
  const params = {
    year: selectedYear.value.toString()
  };

  axios.get('/seaice/predictionExamination/errorAnalysis', { params })
    .then(response => {
      console.log('SIE预测误差分析数据:', response.data);
      // 这里可以添加处理误差分析数据的逻辑
      SIELoading.value = false;
    })
    .catch(error => {
      console.error('获取SIE预测误差分析数据失败:', error);
      SIELoading.value = false;
    });
}

// 提供模拟数据进行测试
const provideMockData = () => {
  console.log('提供模拟数据进行测试');
  // 模拟API返回的sieInitial数据
  const mockData = [
    {
      id: 1,
      year: '2023',
      month: '1',
      var_model: 'prediction_IceTFT',
      trans_data: [13.6167, 14.4987, 14.7067, 13.9476, 12.4564, 10.7049, 8.1375, 5.6611, 4.8756, 7.0192, 9.6816, 11.843]
    },
    {
      id: 2,
      year: '2023',
      month: '1',
      var_model: 'mean_IceTFT',
      trans_data: [13.4172, 14.3311, 14.5397, 13.7891, 12.3423, 10.566, 7.8727, 5.3955, 4.5669, 6.4303, 9.2935, 11.7441]
    },
    {
      id: 3,
      year: '2023',
      month: '1',
      var_model: 'upper_IceTFT',
      trans_data: [13.6167, 14.4987, 14.7067, 14.0279, 12.6705, 11.1256, 8.6293, 6.2009, 5.3105, 7.1362, 9.9591, 12.142]
    },
    {
      id: 4,
      year: '2023',
      month: '1',
      var_model: 'lower_IceTFT',
      trans_data: [13.2177, 14.1635, 14.3728, 13.5502, 12.0141, 10.0065, 7.116, 4.5901, 3.8233, 5.7244, 8.6279, 11.3463]
    }
  ];

  SIEAvailableList.value = mockData;
  const modelData = {
    prediction: mockData.find(item => item.var_model === 'prediction_IceTFT')?.trans_data || [],
    mean: mockData.find(item => item.var_model === 'mean_IceTFT')?.trans_data || [],
    upper: mockData.find(item => item.var_model === 'upper_IceTFT')?.trans_data || [],
    lower: mockData.find(item => item.var_model === 'lower_IceTFT')?.trans_data || []
  };
  SIEOption.value = buildSIEChartOption(modelData);
  SIEDescription.value = `2023年1月模拟预测数据`;
}

// 更新SIE图表
const updateSIEChart = async () => {
  SIELoading.value = true;
  updateSIEChartTitle();
  const params = {
    year: selectedYear.value.toString(),  // 后端接收字符串类型，保持一致
    month: selectedMonth.value.toString()
  };
  axios.get('/seaice/predictionResult/SIE', { params })
    .then(response => {
      const data = response.data;
      // 直接使用后端返回的完整图表配置
      SIEOption.value = data.option;  
      // 直接使用后端返回的描述文本
      SIEDescription.value = data.description;  
      SIELoading.value = false;
    })
    .catch(error => {
      console.error('获取SIE预测结果失败:', error);
      SIELoading.value = false;
    });
};

// 构建SIE图表选项 - 支持多模型数据
const buildSIEChartOption = (modelData) => {
  // 创建月份标签（1月到12月）
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // 定义系列数据
  const series = [];

  // 添加预测值系列
  if (modelData.prediction.length > 0) {
    series.push({
      name: '预测值',
      type: 'line',
      data: modelData.prediction,
      smooth: true,
      lineStyle: {
        width: 3
      },
      itemStyle: {
        color: '#8fb2c9'
      }
    });
  }

  // 添加均值系列
  if (modelData.mean.length > 0) {
    series.push({
      name: '均值',
      type: 'line',
      data: modelData.mean,
      smooth: true,
      lineStyle: {
        width: 2,
        type: 'dashed'
      },
      itemStyle: {
        color: '#5e7ce0'
      }
    });
  }

  // 添加上限系列
  if (modelData.upper.length > 0) {
    series.push({
      name: '上限',
      type: 'line',
      data: modelData.upper,
      smooth: true,
      lineStyle: {
        width: 2,
        type: 'dotted'
      },
      itemStyle: {
        color: '#ff7e67'
      }
    });
  }

  // 添加下限系列
  if (modelData.lower.length > 0) {
    series.push({
      name: '下限',
      type: 'line',
      data: modelData.lower,
      smooth: true,
      lineStyle: {
        width: 2,
        type: 'dotted'
      },
      itemStyle: {
        color: '#a2d5f2'
      }
    });
  }

  return {
    title: {
      text: '海冰范围预测'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: series.map(item => item.name)
    },
    xAxis: {
      type: 'category',
      data: months
    },
    yAxis: {
      type: 'value',
      name: '海冰范围(10^6 km²)'
    },
    series: series
  };
}

// 初始化SIC可请求的年月
const initSICAvailableList = () => {
  updateSICChartTitle();
  SICLoading.value = true;
  
  // 首先检查SICAvailableList是否存在且是有效的ref对象
  if (!SICAvailableList || typeof SICAvailableList.value === 'undefined') {
    console.error('SICAvailableList is not properly initialized!');
    SICLoading.value = false;
    return;
  }
  
  // 使用相对路径，不再硬编码URL
  const apiUrl = '/seaice/initial/SICprediction';
  console.log('请求URL:', apiUrl);
  
  axios.get(apiUrl)
    .then(response => {
      console.log('响应状态:', response.status);
      console.log('响应头:', response.headers);
      console.log('响应数据:', response.data);
      
      // 确保value是对象
      if (typeof SICAvailableList.value !== 'object' || SICAvailableList.value === null) {
        SICAvailableList.value = {
          yearList: [],
          monthList: [],
          dateList: []
        };
      }
      
      // 确保属性存在且是数组
      if (!Array.isArray(SICAvailableList.value.yearList)) SICAvailableList.value.yearList = [];
      if (!Array.isArray(SICAvailableList.value.monthList)) SICAvailableList.value.monthList = [];
      if (!Array.isArray(SICAvailableList.value.dateList)) SICAvailableList.value.dateList = [];
      
      // 检查response.data是否存在
      if (!response.data) {
        console.error('API response data is undefined. 请检查后端服务是否正常运行。');
        alert('获取数据失败，请检查后端服务是否正常运行。');
        SICAvailableList.value.yearList = [];
        SICAvailableList.value.monthList = [];
        SICAvailableList.value.dateList = [];
      } else {
        // 安全赋值
        SICAvailableList.value.yearList = Array.isArray(response.data.yearList) ? response.data.yearList : [];
        SICAvailableList.value.monthList = Array.isArray(response.data.monthList) ? response.data.monthList : [];
        SICAvailableList.value.dateList = Array.isArray(response.data.dateList) ? response.data.dateList : [];
        imgSrc.value = response.data.sicInitial || '';
        
        // 打印赋值后的状态
        console.log('赋值后的数据:', {
          yearList: SICAvailableList.value.yearList,
          monthList: SICAvailableList.value.monthList,
          dateList: SICAvailableList.value.dateList,
          imgSrc: imgSrc.value
        });
      }
      
      // 检查数组是否有数据
      if (SICAvailableList.value.yearList.length > 0) {
        let newestYear = Math.max(...SICAvailableList.value.yearList);
        let newestMonth = Math.max(...SICAvailableList.value.monthList);
        let newestDate = Math.max(...SICAvailableList.value.dateList);
        selectedTime.value = new Date(newestYear, newestMonth - 1, newestDate);
      } else {
        console.warn('yearList is empty, cannot determine newest date');
      }
      
      imgIndex.value = 0;
      loadImg(imgSrc.value);
      SICLoading.value = false;
      updateSICChartTitle();
    })
    .catch(error => {
      console.error('API请求失败:', error);
      // 区分不同类型的错误
      if (error.response) {
        // 服务器返回了错误状态码
        console.error('错误状态码:', error.response.status);
        console.error('错误响应:', error.response.data);
      } else if (error.request) {
        // 请求已发送但未收到响应
        console.error('没有收到响应:', error.request);
      } else {
        // 设置请求时发生错误
        console.error('请求配置错误:', error.message);
      }
      console.error('错误堆栈:', error.stack);
      SICLoading.value = false;
    });
}

function updateSIEChartTitle() {
  //使元素失焦
  document.activeElement.blur();

  let year1 = selectedYear.value;
  let month1 = selectedMonth.value;
  let year2 = '';
  let month2 = '';
  if (Number(month1) === 1) {
    month2 = '12';
    year2 = year1;
  }
  else {
    month2 = (Number(month1) - 1).toString().padStart(2, '0');
    year2 = Number(year1) + 1 + '';
  }
  SIEChartTitle.value = year1 + '年' + month1 + '月~' + year2 + '年' + month2 + '月 海冰预测结果';
}

const seaIceForecastLabel = computed(() => {
  if (selectedSIE.value) {
    return `${selectedYear.value}年${String(selectedMonth.value).padStart(2, '0')}月 海冰预测结果`;
  }
  return `${selectedDay.value.getFullYear()}年${selectedDay.value.getMonth() + 1}月${selectedDay.value.getDate()}日 海冰SIC预测结果`;
});

function updateSICChartTitle() {
  SICChartTitle.value = selectedDay.value.getFullYear() + '年' + (selectedDay.value.getMonth() + 1) + '月' + selectedDay.value.getDate() + '日 海冰SIC预测结果';
}

async function deleteForecastResult() {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${seaIceForecastLabel.value} 吗？删除后将无法恢复。`,
      '删除预报结果图',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        draggable: true,
      }
    );

    const payload = selectedSIE.value
      ? {
          year: String(selectedYear.value),
          month: String(selectedMonth.value),
          day: null,
          type: 'SIC',
        }
      : {
          year: String(selectedDay.value.getFullYear()),
          month: String(selectedDay.value.getMonth() + 1),
          day: String(selectedDay.value.getDate()),
          type: 'SIC',
        };

    const { data } = await axios.post('/admin/forecast-result-images/delete', payload);
    ElMessage.success(data?.message || '预报结果图删除成功');

    if (selectedSIE.value) {
      await updateSIEChart();
    } else {
      await updateSICChart();
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除预报结果图失败', error);
      ElMessage.error(error?.response?.data?.message || '删除预报结果图失败');
    }
  }
}

function disabledMonth(day) {
  const year = day.getFullYear();
  const month = day.getMonth() + 1;
  for (let i = 0; i < SIEAvailableList.value.length; i++) {
    if (year == SIEAvailableList.value[i].year && month == SIEAvailableList.value[i].month) {
      return false;
    }
  }
  return true;
}

function disabledDate(day) {
  const year = day.getFullYear();
  const month = day.getMonth() + 1;
  const date = day.getDate();
  for (let i = 0; i < SICAvailableList.value.yearList.length; i++) {
    for (let j = 0; j < SICAvailableList.value.monthList.length; j++) {
      for (let k = 0; k < SICAvailableList.value.dateList.length; k++) {
        if (year == SICAvailableList.value.yearList[i] && month == SICAvailableList.value.monthList[j] && date == SICAvailableList.value.dateList[k]) {
          return false;
        }
      }
    }
  }
  return true;
}

/* 使el-button点击后能正常失焦 Start */
const buttonLeft = ref(null);
const buttonRight = ref(null);

const changeIndex = (direction) => {
  if (direction === 'left') {
    imgIndex.value = imgIndex.value === 0 ? imgSrc.value.length - 1 : imgIndex.value - 1;
    buttonLeft.value.$el.blur();
  } else {
    imgIndex.value = imgIndex.value === imgSrc.value.length - 1 ? 0 : imgIndex.value + 1;
    buttonRight.value.$el.blur();
  }
};

defineExpose({ changeIndex });
/* 使el-button点击后能正常失焦 End */

// 图片预加载
const loadImg = (imgList) => {
  imgList.forEach(src => {
    let img = new Image();
    // 使用环境变量中的API前缀，而不是硬编码的地址
    img.src = import.meta.env.VITE_API_PREFIX + src;
    img.onload = () => console.log('加载完毕', img.src);
    img.onerror = () => console.log('加载错误', img.src);
  });
}

onMounted(() => {
  initSIEAvailableList();
  initSICAvailableList();
});
</script>

<template>
  <div class="pageContent">
    <div class="banner">
      <img :src="bannerImg" />
      <h3 class="title">海冰预测结果</h3>
    </div>

    <div class="menu-container">
      <ul class="menu">
        <div :style="movBoxStyle" class="mov-box"></div>
        <li v-for="(chartName, index) of chartNames" :key="chartName" @click="selectChart(index)"
          :class="{ 'chart-name-selected': chartSelected === index }">
          <p>{{ chartName }}</p>
        </li>
      </ul>
    </div>

    <div style="margin: 0 10%;">

      <div class="datePickerContainer">
        <el-date-picker @change="updateSIEChart" v-model="selectedTime" :clearable="false" type="month"
          :disabled-date="disabledMonth" v-if="selectedSIE" />
        <el-date-picker @change="updateSICChart" v-model="selectedTime" :clearable="false" :disabled-date="disabledDate"
          v-if="selectedSIC" />
      </div>

      <div class="result-actions" v-if="selectedSIE || selectedSIC">
        <el-button type="danger" plain :icon="Delete" class="delete-btn" @click="deleteForecastResult">
          删除预报结果图
        </el-button>
      </div>

      <div class="text-container" v-if="selectedSIE">
        <div class="description">
          {{ SIEDescription }}
        </div>
      </div>

    </div>

    <div>
      <p></p>
    </div>

    <!-- 这里的chart-selector为全局样式，不用在本文件中添加 -->
    <div v-if="selectedSIE" class="chart-selector">
      <v-chart class="SIEChart" :option="SIEOption" autoresize />
    </div>

    <div style="margin:0 10%;">
      <div v-if="selectedSIC" class="whole_container">
        <h3 style="text-align: center; margin-top: 0px; font-size: 18px">{{ SICChartTitle }}</h3>
        <h4 style="text-align: center; margin-top: 0px; font-size: 16px">({{ imgIndex + 1 }}/{{ imgSrc.length }})</h4>
        <div class="imageContainer">
          <img v-if="imgSrc.length" :src="'http://tianxing.tongji.edu.cn' + imgSrc[imgIndex]" class="image" alt="" />
          <el-button ref="buttonLeft" type="primary" class="arrowLeft" :icon="ArrowLeft" @click="changeIndex('left')" />
          <el-button ref="buttonRight" type="primary" class="arrowRight" :icon="ArrowRight"
            @click="changeIndex('right')" />
        </div>
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
  color: rgb(19, 24, 36);
}

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


.datePickerContainer {
  /* 其他样式 */
  display: flex;
  justify-content: flex-end;
  position: relative;
  padding: 50px 0 18px;
  //margin-right: 5%; //new
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}

.delete-btn {
  box-shadow: 0px 8px 18px rgba(220, 38, 38, 0.12);
}

.SIEChartContainer {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  // padding: 0px 15%;
}

.text {
  margin-left: 5px;
  margin-right: 10px;
}

.whole_container {
  width: 100%;
  position: relative;
}

.imageContainer {
  position: relative;
  /* 使按钮定位在 imageContainer 内 */
  text-align: center;
  width: 100%;
  height: 400px;
  overflow: hidden;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
  display: flex;
  /* 使用 flexbox 布局 */
  align-items: center;
  /* 垂直方向居中 */
  justify-content: center;
  /* 水平方向居中 */
  padding-top: 20px;
  padding-bottom: 20px;
}

.SIEChart {
  height: 500px;
  background-color: white;
  /* 圆角 */
  border-radius: 8px;
  /* 阴影 */
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
  padding-top: 20px;
  padding-bottom: 20px;
}

.image {
  /* 限制图片的高度 */
  max-height: 95%;
  max-width: 95%;
  position: relative;
  object-fit: contain;
}

//下面这个样式不用加，因为全局样式里面有对应的了

// /* 设置箭头按钮的样式 */
// .el-button.arrowLeft,
// .el-button.arrowRight {
//   position: relative;
//   margin: 20px;
//   width: 40px;
//   height: 80px;
// }


.description {
  //position: relative;
  text-align: center;
  /* 使文本内容居中 */
  font-size: 17px;
}

.text-container {
  position: relative;
  margin: 0px auto;
  text-align: center;
  background-color: rgba(239, 242, 252, 0.801);
  ;
  /* 淡紫色 */
  //display: flex;
  padding: 20px;
  border-radius: 8px;
  /* 可选的圆角 */
  box-shadow: 0px 0px 10px 1.5px rgba(199, 198, 198, 0.893);
  /* 阴影 */
  //font-family: 'STKaiti';
}
</style>
