# AgentForge - AI 智能体与工作流管理平台 (Web前端)

AgentForge 是一个基于 Vue 3、TypeScript 和 Tailwind CSS 构建的高性能 AI 智能体 (Agent) 与自动化工作流 (Workflow) 编排平台前端系统。支持可视化智能体配置、多节点工作流拖拽/连线、知识库管理、日志监控以及基于双 Token 架构的安全认证。

---

## 🛠️ 技术栈

- **核心框架**：Vue 3 (Composition API / Script Setup)
- **构建工具**：Vite
- **开发语言**：TypeScript
- **状态管理**：Pinia / Reactivity Store
- **样式方案**：Tailwind CSS + Lucide Icons
- **网络请求**：Axios (支持 `withCredentials` Cookie 传输与全局 401 静默刷新)
- **图形与图表**：ECharts / Recharts / Canvas 流程图渲染

---

## ✨ 核心功能模块

1. **双令牌认证体系 (v2.0)**
   - **Access Token** 存储于前端内存，用于 API 授权请求（传输头：`Authorization: Bearer <token>`）。
   - **Refresh Token** 托管于后端 `httpOnly` Cookie，前端防 XSS 注入。
   - 全局 Axios 拦截器，支持 401 无感并发刷新队列与静默恢复登录态。
   - 登录失败响应规范化（HTTP 400：1001/1002/1003），隔离认证失效与凭证校验错误。

2. **智能体控制台 (Agent Workbench)**
   - 智能体创建、角色提示词 (System Prompt) 设定、模型参数调优 (Temperature, Top-P)。
   - 知识库与工具插件 (Tools/Plugins) 绑定。
   - 实时对话测试与交互调优。

3. **工作流编排器 (Workflow Builder)**
   - 可视化工作流节点配置（LLM 节点、条件分支、代码执行、API 调起等）。
   - 实时运行日志与节点状态追踪。

4. **知识库管理 (Knowledge Base)**
   - 向量化文档上传、分块策略设定与检索测试。

5. **系统监控与日志 (Analytics & Logs)**
   - Token 消耗统计、调用延迟监控与历史调用日志查看。

---

## 🔒 认证架构 (v2.0 双令牌模型)

```
┌─────────────────────────────────────────────────────────────┐
│                      登录成功后                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Access Token (2小时)          Refresh Token (7天)          │
│  ├─ 存储：前端内存 / TokenManager ├─ 存储：httpOnly cookie      │
│  ├─ 用途：API 请求认证          ├─ 用途：换取新 access token  │
│  ├─ 传输：Authorization Header ├─ 传输：浏览器自动携带 Cookie │
│  └─ JS 可读：是                 └─ JS 可读：否（防 XSS）      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 1. 环境准备

- Node.js 18.x 或更高版本
- npm / pnpm / yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 开发环境运行

启动前端 Vite 开发服务器（默认端口 `3000`，代理后端服务 `http://localhost:8080`）：

```bash
npm run dev
```

浏览器访问：`http://localhost:3000`

### 4. 项目打包

生成生产环境静态构建产物：

```bash
npm run build
```

构建输出路径：`dist/`

### 5. 语法规范与 Lint 检查

```bash
npm run lint
```

---

## ⚙️ Vite 代理与跨域配置 (`vite.config.ts`)

开发模式下 Vite 已配置跨域代理与 Cookie 域名重写，支持带有 `httpOnly` 标记的 `agentforge_refresh_token` Cookie 顺畅传输：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
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
});
```

---

## 📁 项目目录结构

```
.
├── src/
│   ├── api/             # Axios 实例配置、TokenManager、接口定义
│   ├── components/      # 通用 UI 组件与页面视图组件 (P01_Login, P02_Dashboard 等)
│   ├── stores/          # 状态管理 (useAppStore.ts)
│   ├── types/           # TypeScript 全局接口与数据模型定义
│   ├── utils/           # 工具函数与格式化方法
│   ├── App.vue          # 根组件
│   └── main.ts          # 应用入口文件
├── public/              # 静态资源
├── index.html           # HTML 入口
├── package.json         # 项目依赖与脚本配置
├── vite.config.ts       # Vite 构建与代理配置
└── README.md            # 项目说明文档
```

---

## 📝 开源协议

MIT License
