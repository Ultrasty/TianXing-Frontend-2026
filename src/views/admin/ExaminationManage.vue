<!-- src/views/admin/ExaminationManage.vue -->
<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Refresh, Download } from '@element-plus/icons-vue'

// API 封装，暂时使用 fake data
const mockData = [
  { id: 1, year: '2023', month: '01', varModel: 'ENS_3.4', category: 'ENSO', data: '{"rmse":0.32,"corr":0.87}' },
  { id: 2, year: '2023', month: '02', varModel: 'ENS_3.4', category: 'ENSO', data: '{"rmse":0.28,"corr":0.91}' },
  { id: 3, year: '2023', month: '03', varModel: 'AIFS_3.4', category: 'ENSO', data: '{"rmse":0.35,"corr":0.82}' },
]

// TODO: 换 API 
const api = {
  // 查询列表
  getList: (params) => {
    console.log('[API] 查询列表:', params)
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = mockData
        if (params.year) filtered = filtered.filter(d => d.year === params.year)
        if (params.month) filtered = filtered.filter(d => d.month === params.month)
        if (params.category) filtered = filtered.filter(d => d.category === params.category)
        resolve({ data: { list: filtered, total: filtered.length } })
      }, 300)
    })
  },
  // 新增
  add: (data) => {
    console.log('[API] 新增:', data)
    return new Promise((resolve) => {
      setTimeout(() => {
        const newItem = { ...data, id: Date.now() }
        mockData.unshift(newItem)
        resolve({ data: newItem })
      }, 300)
    })
  },
  // 更新
  update: (data) => {
    console.log('[API] 更新:', data)
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockData.findIndex(d => d.id === data.id)
        if (index !== -1) {
          mockData[index] = { ...mockData[index], ...data }
        }
        resolve({ data: mockData[index] })
      }, 300)
    })
  },
  // 删除
  delete: (id) => {
    console.log('[API] 删除:', id)
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockData.findIndex(d => d.id === id)
        if (index !== -1) {
          mockData.splice(index, 1)
        }
        resolve({ data: {} })
      }, 300)
    })
  },
  // 从 ECMWF 获取原始数据（由队友提供接口）
  fetchECMWF: (params) => {
    console.log('[API] 从 ECMWF 获取:', params)
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟 ECMWF 返回的原始数据
        resolve({
          data: {
            raw: {
              forecasts: [
                { lead_time: 1, value: 0.52 },
                { lead_time: 2, value: 0.61 },
                { lead_time: 3, value: 0.73 },
              ],
              metadata: { model: params.model, source: 'ECMWF' }
            }
          }
        })
      }, 500)
    })
  }
}

// 页面 
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('新增预报评估数据')
const isEdit = ref(false)

// 搜索表单
const searchForm = reactive({
  year: '',
  month: '',
  category: '',
})

// 数据表单
const formData = reactive({
  id: null,
  year: '',
  month: '',
  varModel: '',
  category: 'ENSO',
  data: '',
})

// ECMWF 获取相关
const ecmwfLoading = ref(false)
const ecmwfParams = reactive({
  year: '',
  month: '',
  model: 'ENS',
})

// manual：手动上传, ecmwf：从ECMWF获取）
const dataSource = ref('manual')

// ======================== 列表查询 ========================
const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (searchForm.year) params.year = searchForm.year
    if (searchForm.month) params.month = searchForm.month
    if (searchForm.category) params.category = searchForm.category
    
    const res = await api.getList(params)
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error('加载数据失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 重置搜索
const resetSearch = () => {
  searchForm.year = ''
  searchForm.month = ''
  searchForm.category = ''
  loadData()
}

// 打开新增弹窗 
const handleAdd = () => {
  dialogTitle.value = '新增预报评估数据'
  isEdit.value = false
  dataSource.value = 'manual'
  // 重置表单
  formData.id = null
  formData.year = ''
  formData.month = ''
  formData.varModel = ''
  formData.category = 'ENSO'
  formData.data = ''
  // 重置 ECMWF 参数
  ecmwfParams.year = ''
  ecmwfParams.month = ''
  ecmwfParams.model = 'ENS'
  dialogVisible.value = true
}

// 打开编辑弹窗
const handleEdit = (row) => {
  dialogTitle.value = '编辑预报评估数据'
  isEdit.value = true
  dataSource.value = 'manual'
  Object.assign(formData, {
    id: row.id,
    year: row.year,
    month: row.month,
    varModel: row.varModel,
    category: row.category,
    data: row.data,
  })
  dialogVisible.value = true
}

// 从 ECMWF 获取数据
const handleFetchECMWF = async () => {
  if (!ecmwfParams.year || !ecmwfParams.month) {
    ElMessage.warning('请先填写年份和月份')
    return
  }
  
  ecmwfLoading.value = true
  try {
    // todo：调用 ECMWF 获取接口
    const res = await api.fetchECMWF({
      year: ecmwfParams.year,
      month: ecmwfParams.month,
      model: ecmwfParams.model,
    })
    
    // 【转换逻辑】将 ECMWF 返回的原始数据，转换为项目统一的 JSON 格式
    // 队友返回的数据结构假设为: { raw: { forecasts: [...], metadata: {...} } }
    const rawData = res.data.raw || res.data
    
    // 示例转换：提取 forecasts 数组并转为 JSON 字符串
    // 实际转换逻辑需根据队友提供的接口文档调整
    let convertedData = {}
    if (Array.isArray(rawData.forecasts)) {
      // 如果返回的是 forecasts 数组，提取并转为 JSON
      convertedData = {
        forecasts: rawData.forecasts,
        metadata: rawData.metadata || {},
        source: 'ECMWF',
        fetchTime: new Date().toISOString(),
      }
    } else {
      convertedData = rawData
    }
    
    formData.data = JSON.stringify(convertedData, null, 2)
    formData.year = ecmwfParams.year
    formData.month = ecmwfParams.month
    formData.varModel = ecmwfParams.model
    
    ElMessage.success('ECMWF 数据获取并转换成功！请检查后提交')
  } catch (error) {
    ElMessage.error('获取 ECMWF 数据失败: ' + error.message)
  } finally {
    ecmwfLoading.value = false
  }
}

// 提交数据（新增/更新）
const handleSubmit = async () => {
  // 简单校验
  if (!formData.year || !formData.month || !formData.varModel || !formData.data) {
    ElMessage.warning('请完整填写所有字段')
    return
  }
  
  // 校验 data 合法
  try {
    JSON.parse(formData.data)
  } catch {
    ElMessage.error('"评估数据" 字段必须是有效的 JSON 格式')
    return
  }
  
  loading.value = true
  try {
    const submitData = {
      year: formData.year,
      month: formData.month,
      varModel: formData.varModel,
      category: formData.category,
      data: formData.data,
    }
    
    let res
    if (isEdit.value) {
      // 更新
      res = await api.update({ ...submitData, id: formData.id })
      ElMessage.success('更新成功')
    } else {
      // 新增
      res = await api.add(submitData)
      ElMessage.success('新增成功')
    }
    
    dialogVisible.value = false
    loadData() // 刷新列表
  } catch (error) {
    ElMessage.error('提交失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 删除数据
const deleteDialogVisible = ref(false)
const deleteRow = ref(null)
const deleteLoading = ref(false)

const handleDelete = (row) => {
  deleteRow.value = row
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  if (!deleteRow.value) return
  deleteLoading.value = true
  try {
    await api.delete(deleteRow.value.id)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    deleteRow.value = null
    loadData()
  } catch (error) {
    ElMessage.error('删除失败: ' + error.message)
  } finally {
    deleteLoading.value = false
  }
}

// 格式化
const formatJson = (str) => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

// 加载时查询
onMounted(() => {
  loadData()
})

// 暴露 loadData 方法给父组件使用
defineExpose({ loadData })
</script>

<template>
  <div class="examination-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>预报评估数据管理</h2>
      <p>管理 ENSO / NAO / 海冰 等板块的预报评估数据</p>
    </div>

    <!-- 搜索区域 -->
    <div class="search-area">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="年份">
          <el-input v-model="searchForm.year" placeholder="如: 2023" style="width: 150px" clearable />
        </el-form-item>
        <el-form-item label="月份">
          <el-input v-model="searchForm.month" placeholder="如: 01" style="width: 120px" clearable />
        </el-form-item>
        <el-form-item label="板块">
          <el-select v-model="searchForm.category" placeholder="全部" style="width: 140px" clearable>
            <el-option label="ENSO" value="ENSO" />
            <el-option label="NAO" value="NAO" />
            <el-option label="海冰" value="SeaIce" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <div style="display: flex; align-items: center;">
            <el-button 
              type="primary" 
              link 
              size="small" 
              style="margin-left: -40px; margin-top: -7px; font-size: 14px; padding: 0 40px;" 
              @click="loadData" 
              :icon="Refresh"
            >
              查询
            </el-button>
            <el-button 
              link 
              size="small" 
              style="margin-left: 10px; margin-top: -7px; font-size: 14px; padding: 0 40px;" 
              @click="resetSearch"
            >
              重置
            </el-button>
            <el-button 
              type="success" 
              link 
              size="small" 
              @click="handleAdd" 
              style="margin-left: 80px; margin-top: -7px; font-size: 14px; padding: 0 40px;" 
              :icon="Plus"
            >
              新增数据
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格 -->
    <el-table :data="tableData" border v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" align="center" />
      <el-table-column prop="year" label="年份" width="120" align="center" />
      <el-table-column prop="month" label="月份" width="100" align="center" />
      <el-table-column prop="varModel" label="模型/变量" min-width="150" align="center" />
      <el-table-column prop="category" label="板块" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.category === 'ENSO' ? 'success' : row.category === 'NAO' ? 'warning' : 'info'">
            {{ row.category }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="data" label="评估数据 (JSON)" min-width="200">
        <template #default="{ row }">
          <el-popover placement="top-start" :width="400" trigger="hover">
            <template #reference>
              <el-text truncated style="max-width: 180px; display: inline-block">
                {{ formatJson(row.data) }}
              </el-text>
            </template>
            <pre style="max-height: 300px; overflow: visible; font-size: 12px; white-space: pre-wrap; word-break: break-all">
              {{ formatJson(row.data) }}
            </pre>
          </el-popover>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="240" align="center" fixed="right">
        <template #default="{ row }">
          <div style="display: flex; justify-content: center; align-items: center;">
            <el-button 
              type="primary" 
              link 
              size="small"
              style="font-size: 14px; margin-right: 100px; margin-top: 15px; padding: 0 40px;" 
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button 
              type="danger" 
              link 
              size="small"
              style="font-size: 14px; margin-left: 100px; margin-top: 15px; padding: 0 40px;" 
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-area">
      <el-pagination
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="10"
        @current-change="loadData"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" destroy-on-close>
      <el-form :model="formData" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年份" required>
              <el-input v-model="formData.year" placeholder="如: 2024" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="月份" required>
              <el-input v-model="formData.month" placeholder="如: 01" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="模型名称" required>
              <el-input v-model="formData.varModel" placeholder="如: ENS_3.4" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="板块" required>
              <el-select v-model="formData.category" style="width: 100%">
                <el-option label="ENSO" value="ENSO" />
                <el-option label="NAO" value="NAO" />
                <el-option label="海冰" value="SeaIce" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 数据来源切换 -->
        <el-form-item label="数据来源" v-if="!isEdit">
          <el-radio-group v-model="dataSource">
            <el-radio-button value="manual">手动输入</el-radio-button>
            <el-radio-button value="ecmwf">从 ECMWF 获取</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 手动输入模式 -->
        <el-form-item label="评估数据" required v-if="dataSource === 'manual'">
          <el-input
            v-model="formData.data"
            type="textarea"
            :rows="6"
            placeholder='请输入 JSON 格式的评估数据，如: {"rmse": 0.32, "corr": 0.87}'
          />
          <el-text size="small" type="info">必须是有效的 JSON 格式</el-text>
        </el-form-item>

        <!-- ECMWF 获取模式 -->
        <template v-if="dataSource === 'ecmwf'">
          <el-divider content-position="left">ECMWF 数据获取</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="年份">
                <el-input v-model="ecmwfParams.year" placeholder="2024" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="月份">
                <el-input v-model="ecmwfParams.month" placeholder="01" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="模型">
                <el-select v-model="ecmwfParams.model" style="width: 100%">
                  <el-option label="ENS" value="ENS" />
                  <el-option label="AIFS" value="AIFS" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item>
            <div style="display: flex; align-items: center;">
              <el-button 
                type="primary" 
                link 
                size="small" 
                style="font-size: 14px; margin-top: -5px; margin-left: -80px; padding: 0 120px;"  
                @click="handleFetchECMWF" 
                :loading="ecmwfLoading"
                :icon="Download"
              >
                获取并转换 ECMWF 数据
              </el-button>
              <el-text size="small" type="info" style=" margin-left: -20px; margin-top: 10px">
                点击后自动将 ECMWF 数据转换为标准格式并填入上方
              </el-text>
            </div>
          </el-form-item>
          <el-form-item label="转换后数据" v-if="formData.data">
            <el-input
              v-model="formData.data"
              type="textarea"
              :rows="4"
              readonly
            />
          </el-form-item>
        </template>
      </el-form>

      <!-- 弹窗底部按钮，我服了，为什么#footer标签没有用 -->
      <template #footer v-if="dataSource === 'ecmwf'">
        <div style="display: flex; justify-content: flex-end; align-items: center;">
          <el-button 
            link 
            size="small" 
            style="font-size: 14px; margin-left: 20px; margin-top: 320px;" 
            @click="dialogVisible = false"
          >
            取消
          </el-button>
          <el-button 
            type="primary" 
            link 
            size="small" 
            style="font-size: 14px; margin-right: 40px; margin-top: 320px;" 
            @click="handleSubmit" 
            :loading="loading"
            :disabled="dataSource === 'ecmwf' && !formData.data"
          >
            {{ isEdit ? '更新' : '提交' }}
          </el-button>
        </div>
      </template>

      <template v-if="dataSource === 'manual' && !isEdit" >
        <div style="display: flex; justify-content: flex-end; align-items: center;">
          <el-button 
            link 
            size="small" 
            style="font-size: 14px; margin-left: 20px; margin-top: 360px;" 
            @click="dialogVisible = false"
          >
            取消
          </el-button>
          <el-button 
            type="primary" 
            link 
            size="small" 
            style="font-size: 14px; margin-right: 40px; margin-top: 360px;" 
            @click="handleSubmit" 
            :loading="loading"
            :disabled="dataSource === 'ecmwf' && !formData.data"
          >
            {{ isEdit ? '更新' : '提交' }}
          </el-button>
        </div>
      </template>

      <template v-if="dataSource === 'manual' && isEdit" >
        <div style="display: flex; justify-content: flex-end; align-items: center;">
          <el-button 
            link 
            size="small" 
            style="font-size: 14px; margin-left: 20px; margin-top: 320px;" 
            @click="dialogVisible = false"
          >
            取消
          </el-button>
          <el-button 
            type="primary" 
            link 
            size="small" 
            style="font-size: 14px; margin-right: 40px; margin-top: 320px;" 
            @click="handleSubmit" 
            :loading="loading"
            :disabled="dataSource === 'ecmwf' && !formData.data"
          >
            {{ isEdit ? '更新' : '提交' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    <!-- 自定义删除确认弹窗 -->
    <el-dialog 
      v-model="deleteDialogVisible" 
      title="请确认删除" 
      width="420px" 
      destroy-on-close
      >
      <div style="padding: 10px 0;">
        <p style="font-size: 16px; color: #606266;">
          确定要删除 {{ deleteRow?.year }}年{{ deleteRow?.month }}月的 "{{ deleteRow?.varModel }}" 评估数据吗？
        </p>
      <el-text type="warning" size="small">此操作不可撤销，请谨慎操作</el-text>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 16px;">
          <el-button 
            link 
            size="small" 
            style="font-size: 14px; margin-top: 130px;" 
            @click="deleteDialogVisible = false"
          >
          取消
          </el-button>
          <el-button 
            type="danger" 
            link 
            size="small" 
            style="font-size: 14px; margin-right: 40px; margin-top: 130px;" 
            @click="confirmDelete"
            :loading="deleteLoading"
          >
          删除
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style>
/* 删除确认框宽度和按钮样式 */
.delete-confirm-box {
  width: 480px !important;
  height: 120px !important;
}

.delete-confirm-box .el-message-box__btns {
  display: flex !important;
  flex-wrap: nowrap !important;       
}

.delete-confirm-box .el-message-box__btns .el-button {
  background: transparent !important;
  border: none !important;
  font-size: 14px !important;
  margin-top: 30px !important;
  padding: 0 80px !important;
  color: #409eff !important;
  flex-shrink: 0 !important;
}
.delete-confirm-box .el-message-box__btns .el-button--default {
  color: #909399 !important;
}
.delete-confirm-box .el-message-box__btns .el-button--default:hover {
  color: #606266 !important;
}
.delete-confirm-box .el-message-box__btns .el-button--primary {
  color: #409eff !important;
}
.delete-confirm-box .el-message-box__btns .el-button--primary:hover {
  color: #66b1ff !important;
}
</style>

<style scoped lang="scss">
.examination-manage {
  padding: 20px 30px;
  background-color: #f5f7fa;
  min-height: 100vh;

  .page-header {
    margin-bottom: 24px;

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 4px 0;
    }

    p {
      color: #909399;
      font-size: 14px;
      margin: 0;
    }
  }

  .search-area {
    background-color: #fff;
    padding: 20px 24px;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

    :deep(.el-form) {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 0;
    }

    :deep(.el-form-item) {
      margin-bottom: 0;
    }
  }

  .pagination-area {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
    background-color: #fff;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  }
}

:deep(.el-table) {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-divider) {
  margin: 16px 0;
}
</style>