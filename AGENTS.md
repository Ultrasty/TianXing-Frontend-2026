# TianXing-Frontend Agent 指南与协作规范

本文件为参与 `TianXing-Frontend-2026`（同济大学天行气象预测平台前端）项目的 AI Agent 及协同开发者提供真实架构与开发规范指南。

## 1. 项目简介
- **项目名称**：同济大学天行气象预测平台前端 (TianXing-Frontend-2026 / tsaf-front)
- **技术栈**：Vue 3 + Vite 5 + Element Plus + ECharts + TailwindCSS + TypeScript + pnpm (8.15.4)
- **核心业务**：提供 ENSO（厄尔尼诺与南方涛动）、NAO（北大西洋涛动）、SeaIce（海冰预测）、GlobalWeather（全球天气）四大气象预报板块的可视化图表与数据展示。

## 2. 真实源码架构与目录划分 (`./src`)
- `src/views/`（核心气象业务页面板块）：
  - `ENSO/`: ENSO 预测结果 (`ForecastResult.vue`) 与预测校验 (`ForecastExamination.vue`)
  - `NAO/`: NAO 预测结果 (`ForecastResult.vue`) 与预测校验 (`ForecastExamination.vue`)
  - `SeaIce/`: 海冰预测结果与校验
  - `GlobalWeather/`: 全球天气预测结果
  - `user/`: 页面主要框架与外壳 (`UserView.vue`)
- `src/router/`:
  - `index.ts`: 网页路由配置（新页面须在此注册路径）
  - `HeaderView.vue`: 顶栏与各级菜单（`menus` 数组中维护菜单项）
- `src/assets/`: 网站图片及气象图表静态资源
- `src/composables/` & `src/utils/`: 组合式函数与通用工具类
- `src/mock/`: 本地 Mock 测试数据

## 3. 页面维护与拓展规范
1. **新增页面/板块**：
   - 在 `src/views/` 建立对应的视图 `.vue` 文件。
   - 在 `src/router/index.ts` 中引入并添加对应的路由对象。
   - 在 `src/router/HeaderView.vue` 的 `menus` 数组中添加顶栏菜单入口。
2. **环境与联调配置**：
   - 线上 API: `https://tianxing.tongji.edu.cn/api`
   - 本地联调 API: 在 `.env.local` 中配置 `VITE_API_PREFIX=http://localhost:8888`（临时联调配置）

## 4. 运行与验证指令
- **安装依赖**：
  ```powershell
  pnpm install
  # 或 npm install
  ```
- **启动开发服务器**：
  ```powershell
  pnpm dev
  # 或 npm run dev
  ```
- **打包部署产物 (`dist.zip`)**：
  ```powershell
  pnpm build
  # 或 npm run build
  ```
