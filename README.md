# AgentForge - 企业级多智能体协同调度引擎 (AgentForge Web)

> **AgentForge** 是一套基于 **Vue 3 + TypeScript + Tailwind CSS** 构建的高性能、企业级 AI 智能体编排与自动化协同调度系统。提供多智能体拓扑编排、MCP (Model Context Protocol) 协议服务器生态、DAG 可视化工作流引擎、实时高频日志与流式监控、多模型供应商集成以及基于 RBAC 的细粒度权限控制体系。

---

## 🛠️ 技术栈选型

- **核心框架**：Vue 3 (`<script setup lang="ts">` / Composition API)
- **构建工具**：Vite 6
- **开发语言**：TypeScript 5.8 (强类型定义、严格模式检查)
- **样式体系**：Tailwind CSS v4 + 响应式布局 + 大厂设计规范（Stripe / GitHub / Vercel 风格）
- **图标组件库**：`lucide-vue-next` (现代化细致矢量图标)
- **状态管理**：Pinia 响应式单向数据流 Store (`useAppStore.ts`)
- **网络通信**：Axios (支持 `withCredentials` Cookie 传输、双令牌静默刷新与请求队列)
- **可视化图形**：原生 SVG 高性能动态贝塞尔连线 + Canvas DAG 工作流编排

---

## ✨ 核心功能模块清单

### 1. 🎛️ 系统工作台与全局总览 (`P04_Dashboard`)
- **核心业务指标**：智能体总数、活跃工作流、MCP 服务状态、今日调度总量实时大盘。
- **快捷调度操作**：一键发起工作流调试、快捷跳转 Agent 智能体池。
- **状态响应式联动**：全局监控推流状态与顶部 Header 徽章毫秒级同步。

### 2. 🤖 智能体管理与抽屉配置 (`P08_AgentList` / `P09_AgentDrawer`)
- **Agent 角色定义**：名称、System Prompt 角色提示词设定、模型绑定与温度 (`temperature`)、`top_p` 参数调节。
- **MCP 扩展工具绑定**：一键挂载已注册的 MCP 工具服务器，赋予智能体外部工具调用与环境交互能力。
- **知识库关联**：向量数据库检索配置与相关度阀值调节。
- **抽屉式工程化交互**：响应式滑出抽屉、吸顶状态头、表单独立滚动与吸底操作栏。

### 3. 🔌 MCP (Model Context Protocol) 工具服务生态 (`P10_MCPServerList` / `P11_MCPServerDrawer`)
- **双协议传输支持**：
  - **stdio**：本地进程 Standard I/O 命令行通道 (npx / python / node)。
  - **SSE**：Server-Sent Events 远程 HTTP 长连接与流式端点。
- **服务健康度探测**：一键握手连通性测试与响应延迟探测。
- **工具/资源列表视图**：直观展示 MCP 服务暴露的 Tool、Resource 与 Prompt 模板清单。

### 4. 🔀 可视化 DAG 工作流编排器 (`P05_WorkflowList` / `P06_WorkflowEditor`)
- **节点类型全覆盖**：
  - `start` (触发起点)
  - `agent` (智能体调用)
  - `llm` (基础大模型直调)
  - `condition` (条件判断分支)
  - `tool` (MCP 工具执行)
  - `code` (自定义脚本运行)
  - `end` (汇总输出终点)
- **RAF 拖拽节流**：通过 `requestAnimationFrame` 限制节点高频移动坐标，保持 60fps/120fps 原生流畅度。
- **动态 SVG 贝塞尔连线**：节点端口智能吸附与连线绘制，支持端点高亮与端口交互。
- **版本控制与回退**：内置工作流历史版本备份、状态快照与回滚机制。

### 5. ⚡ 实时推流监控与执行历史 (`P07_ExecutionMonitor` / `P13_ExecutionHistory` / `P14_ExecutionDetail`)
- **零白屏秒开切换**：从历史审计页无缝过渡到实时监控页，本地数据优先首帧上屏。
- **流式 Token 渲染**：高频流式输出与日志终端滚动，内置 1000 条 Ring Buffer 防内存溢出。
- **多维度检索与分段筛选**：支持按运行状态（全部 / 运行中 / 成功 / 终止 / 失败）与关键词快速过滤。
- **运行时调度弹窗**：支持配置运行时环境变量、动态 Payload 参数并发起执行。

### 6. 🌐 大模型供应商中枢 (`P12_LLMProviderList`)
- **主流供应商原生支持**：DeepSeek、OpenAI、Anthropic Claude、Google Gemini、Ollama 本地大模型。
- **模型挂载与管理**：支持一键切换全局默认模型、动态追加挂载模型。
- **Base URL 代理与 API 密钥掩码**：支持自定义反向代理端点，前端密钥掩码存储并提供快速连通性测试。

### 7. 🛡️ RBAC 权限矩阵与用户安全体系 (`P15_UserManagement` / `P16_RoleManagement` / `P17_Profile`)
- **三层角色体系**：
  - **超级管理员 (ADMIN)**：拥有全站所有模块的读取、创建、编辑、删除与系统运维特权。
  - **开发者 (DEVELOPER)**：支持工作流编排、Agent 与 MCP 配置、发起调度测试。
  - **审计访客 (VIEWER)**：只读查看大盘与调度日志，屏蔽所有写操作与敏感管理入口。
- **细粒度权限控制**：路由前置守卫拦截 + Store 写操作权限双重校验 + 按钮级权限显隐控制。
- **用户安全**：支持强制重置初始密码、账号冻结/解冻、个人资料与头像维护。

---

## 🔒 认证架构 (v2.0 双令牌安全体系)

系统采用符合现代 Web 安全规范的双 Token 鉴权架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      登录成功后                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Access Token (2小时)          Refresh Token (7天)          │
│  ├─ 存储：前端内存 / TokenManager ├─ 存储：httpOnly Cookie      │
│  ├─ 用途：API 请求认证          ├─ 用途：换取新 Access Token  │
│  ├─ 传输：Authorization Header ├─ 传输：浏览器自动携带 Cookie │
│  └─ JS 可读：是                 └─ JS 可读：否（彻底杜绝 XSS）│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **并发静默刷新**：当 Access Token 过期收到 `401 Unauthorized` 时，Axios 响应拦截器会自动暂停后续请求，将它们挂入等待队列，使用 Refresh Token 换取新令牌后自动重放，用户全程无感知。
- **错误代码隔离**：登录失败响应采用规范化 HTTP 400（业务代码 `1001` 用户名不存在 / `1002` 密码错误 / `1003` 账号已冻结），隔离认证失效与业务校验异常。

---

## 🎨 UI/UX 体验与大厂交互设计规范

系统遵循 GitHub、Stripe、Vercel 等现代企业级产品的交互与视觉规范：

- **触觉反馈 (Tactile Feedback)**：全局封装 `btn-tactile`，在按钮按下（Active）时提供自然细腻的 `scale-0.97` 按压微动效。
- **分层投影与卡片悬浮 (Card Elevation)**：交互卡片配置 `card-elevated`，在悬停时提供平滑的微上浮与柔和阴影过渡。
- **胶囊分段选项卡 (Segmented Controls)**：列表筛选器采用紧凑的圆角胶囊分段控制器，集成实时数量角标。
- **吸顶表头与斑马纹**：长表格（执行历史、用户列表、权限矩阵）采用半透明背景 `sticky top-0` 吸顶表头与交替浅灰斑马纹。
- **抽屉吸底操作栏**：配置抽屉表单内容与操作按钮解耦，内容独立滚动，操作栏固定吸底，提升长表单操作效率。
- **全局轻量滚动条**：重写了浏览器全局滚动条样式，减少视觉干扰。
- **智能点击外部收起**：顶部用户菜单、弹窗与交互浮层均支持 `click-outside` 自动收起与流畅淡入淡出动画。

---

## 📁 项目工程目录结构

```
.
├── src/
│   ├── api/                      # Axios 实例配置、TokenManager、接口定义
│   │   ├── client.ts             # 统一网络请求客户端与 401 刷新拦截器
│   │   └── tokenManager.ts       # 内存级 Access Token 管理器
│   ├── components/               # 组件体系
│   │   ├── common/               # 全局公共组件
│   │   │   ├── Header.vue        # 顶部导航栏与用户信息下拉菜单
│   │   │   ├── Sidebar.vue       # 侧边栏导航与推流状态指示器
│   │   │   ├── Toast.vue         # 全局轻提示与状态反馈
│   │   │   ├── RunInputDialog.vue # 工作流调度参数配置弹窗
│   │   │   └── ChangePasswordModal.vue # 初始密码重置弹窗
│   │   └── pages/                # 页面视图组件
│   │       ├── P01_Login.vue           # 身份登录与认证页
│   │       ├── P04_Dashboard.vue       # 平台核心概览看板
│   │       ├── P05_WorkflowList.vue    # 工作流编排管理列表
│   │       ├── P06_WorkflowEditor.vue  # DAG 可视化拖拽画布编辑器
│   │       ├── P07_ExecutionMonitor.vue # 实时推流监控与日志终端
│   │       ├── P08_AgentList.vue       # 智能体池列表
│   │       ├── P09_AgentDrawer.vue     # 智能体配置与 MCP 挂载抽屉
│   │       ├── P10_MCPServerList.vue   # MCP 工具服务器列表
│   │       ├── P11_MCPServerDrawer.vue # MCP 服务注册与协议配置抽屉
│   │       ├── P12_LLMProviderList.vue # 大模型供应商与 API Key 配置
│   │       ├── P13_ExecutionHistory.vue # 全量执行历史日志审计
│   │       ├── P14_ExecutionDetail.vue # 单次调度运行详情
│   │       ├── P15_UserManagement.vue  # 平台成员与账号管理
│   │       ├── P16_RoleManagement.vue  # RBAC 角色权限矩阵
│   │       └── P17_Profile.vue         # 个人资料与偏好设置
│   ├── stores/                   # 状态仓库
│   │   └── useAppStore.ts        # 全局应用状态管理 (用户/工作流/Agent/MCP/日志)
│   ├── types/                    # TypeScript 类型定义
│   │   └── index.ts              # 核心数据模型 (User, Workflow, Node, MCP, Run 等)
│   ├── utils/                    # 辅助工具函数库
│   ├── App.vue                   # 根组件
│   └── main.ts                   # 应用程序入口配置
├── public/                       # 静态资源目录
├── index.html                    # SPA 入口 HTML
├── package.json                  # 项目依赖与运行脚本
├── vite.config.ts                # Vite 构建、打包分块与代理配置
├── OPTIMIZATION.md               # 专项架构设计与性能优化文档
└── README.md                     # 平台详细说明文档
```

---

## 🚀 快速启动指南

### 1. 环境依赖要求

- **Node.js**：`>= 18.0.0`
- **包管理器**：`npm` / `pnpm` / `yarn`

### 2. 安装项目依赖

```bash
npm install
```

### 3. 启动开发服务器

启动 Vite 开发服务器（应用监听 `0.0.0.0:3000` 端口）：

```bash
npm run dev
```

启动后可在浏览器中访问：`http://localhost:3000`

### 4. 构建生产产物

生成生产环境极致优化的静态资源：

```bash
npm run build
```

构建输出路径为 `dist/` 目录。

### 5. TypeScript 类型校验与 Lint 检查

```bash
npm run lint
```

---

## ⚙️ Vite 代理与跨域通信配置 (`vite.config.ts`)

开发环境下已配置好反向代理与 `httpOnly` Cookie 域名重写：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'icons': ['lucide-vue-next'],
        },
      },
    },
  },
});
```

---

## 📝 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。
