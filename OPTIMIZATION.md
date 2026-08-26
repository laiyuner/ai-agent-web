# AgentForge 性能优化与前端架构改进指南

本文档汇总记录了 AgentForge AI 智能体与工作流管理平台在渲染性能、数据同步、流式日志处理及构建打包等方面的核心优化方案与技术细节。

---

## 🚀 性能与体验优化汇总

### 1. ⚡ 运行历史跳转推流监控无感平滑切换 (消除白屏与卡顿)

- **问题背景**：
  在运行历史审计页（`P13_ExecutionHistory.vue`）点击“查看详情”跳转至实时推流监控页（`P07_ExecutionMonitor.vue`）时，由于初始化组件必须异步请求后端 API 获取运行单据与 `nodeRuns` 明细，导致页面会先呈现短暂的“暂无执行单据”空白提示再渲染内容，产生明显的卡顿感与视觉跳变。
- **优化方案**：
  1. **同步首帧渲染**：挂载阶段优先从 Pinia / AppStore 响应式数据树中同步检索目标 `runId`。若存在本地单据，则在首个渲染帧（First Frame）直接渲染推流监控基本框架与节点树，消除任何过渡空白期。
  2. **离屏/骨架屏优雅加载**：若通过 URL / 强刷新等无本地状态场景访问，自动呈现带有渐变和 Pulse 脉冲动画的专属“调度审计详情加载骨架屏”。
  3. **后台无缝数据补全**：在首帧成功展示后，后台异步发起 API 请求获取完整历史节点明细与日志，并静默更新，实现零卡顿的秒级平滑过渡。

---

### 2. 🔄 实时推流完成与全站状态响应式同步 (侧边栏 & 顶栏指示器)

- **问题背景**：
  当实时推流（WebSocket / SSE）执行完成、出错或被用户主动打断终止时，页面局部状态已变为 `SUCCESS` / `FAILED` / `TERMINATED`，但左侧 Navigation 菜单旁的 `推流中` Badge 徽章以及顶部 Header 的 `任务推流中` 计数器依然保持运行中状态，无法实时对齐。
- **优化方案**：
  1. **AppStore 增加状态同步原子**：在全局 Store 中新增 `updateRunInStore` 原子方法，确保推流生命周期节点（WebSocket `RUN_STARTED`、`RUN_FINISHED`、`STOP_RUN`）触发时，同步响应式修改 `state.runs` 中对应的单据状态。
  2. **大小写不敏感标准化判定**：重构 `Sidebar.vue` 与 `Header.vue` 中的计算属性，通过 `(status || '').toLowerCase() === 'running'` 进行不敏感判定，彻底解决后端状态枚举（如大写 `RUNNING` 与小写 `running`）引发的计算偏差。
  3. **全站状态实时联动**：推流完成或打断瞬间，左侧导航栏的 `推流中` 高亮徽章即刻自动消失，顶部 Header 指示器同步归零并切换为 `运行引擎就绪`。

---

### 3. 🎨 DAG 可视化画布 60fps/120fps 拖拽平滑 (RAF 节流)

- **问题背景**：
  工作流编辑器（`P06_WorkflowEditor.vue`）中的节点拖拽与动态 SVG 贝塞尔曲线重绘，会在高频 `mousemove` 事件下触发连续的 DOM 重新布局与依赖深度更新，高帧率显示器上容易产生轻微卡顿与 Layout Thrashing（布局抖动）。
- **优化方案**：
  - 引入 `requestAnimationFrame` (RAF) 锁机制对高频 mousemove 事件进行节流。
  - 将坐标计算与 SVG 贝塞尔曲线重塑锁定在浏览器的原生刷新率（60fps/120fps）窗口内，大幅减轻渲染主线程负担，带来丝滑无延迟的节点拖拽体验。

---

### 4. 📜 流式 Token 与高频终端日志渲染防抖

- **问题背景**：
  在 LLM 高频打字机推流（`OUTPUT_CHUNK`）场景下，日志流每秒接收数十上百条增量，频繁执行 `scrollTop = scrollHeight` 计算会导致高频排版与重绘（Reflow），推流日志量极大时可能占用大量内存。
- **优化方案**：
  1. **RAF 批量合并滚动**：将自动滚动置底函数打包至 `requestAnimationFrame` 任务队列中，在一个渲染周期内仅响应一次滚动偏移计算。
  2. **环形缓冲区 (Ring Buffer) 保护**：限制前端日志容器最大呈现 1000 条，超出部分采用环形队首淘汰机制，保障长时运行下的内存安全与 DOM 节点数稳定。

---

### 5. 📦 Vite 细粒度 Code Splitting (代码分割)

- **问题背景**：
  打包产物中大型图标库（`lucide-vue-next`）与框架基础库合并打包在同一个 Vendor chunk 中，导致首屏 JS 体积偏大，且每次应用代码更新都会使整体第三方依赖缓存失效。
- **优化方案**：
  在 `vite.config.ts` 中配置 Rollup 的 `manualChunks` 策略：
  - `vue-vendor`: 独立拆分 `vue` 与 `vue-router` 框架核心依赖。
  - `icons`: 独立打包 `lucide-vue-next` 矢量图标库。
  - `vendor`: 其余第三方 npm 依赖分包。
  - 显著提升首屏加载性能与 HTTP 长期缓存命中率。

---

### 6. 👆 全局交互手感与可点击状态强约束

- 在全局 CSS 样式层注入所有交互控件（`<button>`, `<a>`, `<select>`, `[role="button"]`）的 `cursor: pointer` 强约束，并在 `disabled` 禁态下统一展示 `cursor: not-allowed`，确保鼠标悬停与点击交互体验一致。

---

### 7. 🐛 DAG 画布节点级 Agent 覆写功能打通与持久化 (BUG-005)

- **问题背景**：
  在 DAG 工作流编辑器（`P06_WorkflowEditor.vue`）右侧抽屉中，选中 Agent 节点时支持配置三个“节点级覆写”参数：
  1. 覆写 System Prompt（`systemPromptOverride`）
  2. 超时阈值秒数（`timeoutSeconds`）
  3. 重试次数（`retries`）
  此前这些值仅存在前端临时响应式内存中。保存工作流时由于缺少映射字段被丢弃、页面刷新后重新加载为空、后端执行引擎运行时无法读取节点级配置，导致配置完全无法持久化与生效。
- **优化与修复方案**：
  1. **保存请求映射改造 (`useAppStore.ts -> convertNodeToReq`)**：
     - 新增 `buildAgentOverride` 转换方法，组装 `agentOverride` 结构体：
       - `systemPrompt`: 字符串非空时回传；
       - `timeoutMs`: 将秒转换为毫秒存储（`Math.round(timeoutSeconds * 1000)`）；
       - `retryCount`: 规范化重试次数；
     - 采用“仅提交有效有值键”原则，无任何覆写时回传 `null`，与后端缺省回退全局 Agent 配置逻辑完全一致；
     - 移除无用冗余的 `config` 字段。
  2. **数据加载回填映射 (`api/index.ts -> mapWorkflowDtoToWorkflow`)**：
     - 在接收后端工作流详情时，从 `agentOverride` 逆向解析数据并精确回填至节点 data：
       - `systemPromptOverride = agentOverride?.systemPrompt`
       - `timeoutSeconds = Math.round(agentOverride?.timeoutMs / 1000)`（毫秒逆向转为秒）
       - `retries = agentOverride?.retryCount`
     - 确保页面刷新、编辑工作流、导入/克隆工作流时覆写参数精准回显。
  3. **画布节点 UI 状态增强 (`P06_WorkflowEditor.vue`)**：
     - 在画布渲染 Agent 节点卡片顶部标签处，检测到存在覆写配置时自动展示琥珀色 `覆写` 高亮标签，提升用户在复杂工作流画布下的辨识度。

---

### 8. 🐛 WebSocket 连接地址去除硬编码 8080 端口与清理死代码 (BUG-006)

- **问题背景**：
  在执行监控与调试页面（`P07_ExecutionMonitor.vue`）中，WebSocket 实时推流连接地址原先硬编码为 `${protocol}//${hostname}:8080/ws/v1/runs/${runId}?token=...`：
  1. **生产环境连接彻底阻断**：在生产部署环境中（如 `https://domain.com`），前端静态资源与 API 通过 Nginx 统一反向代理（80/443），后端 8080 端口不对公网开放且无独立 TLS 证书。浏览器在 HTTPS 页面中发起 `wss://domain:8080` 会因 Mixed Content、端口拦截或证书缺失导致连接失败，推流页面持续处于“连接中/已断开”状态，无法接收实时任务日志。
  2. **无效的同步 try-catch 死代码**：原代码尝试用 `try { new WebSocket(...) } catch { fallback }` 处理降级，但 `new WebSocket()` 只在 URL 语法非法时抛出同步异常，网络不可达与连接失败属于异步事件，`catch` 分支永远无法触发，属于死代码。
- **优化与修复方案**：
  1. **同构 Host 动态路由**：
     - 将 WebSocket 地址重构为 `${protocol}//${window.location.host}/ws/v1/runs/${runId}?token=${encodeURIComponent(token)}`。
     - **本地开发**：通过 `ws://localhost:3000/ws/...` 发起，由 Vite 配置文件（`vite.config.ts`）中既有的 `/ws` proxy 规则自动转发至 `ws://localhost:8080`；
     - **生产环境**：通过 `wss://domain.com/ws/...` 发起，由 Nginx 的 `location /ws` 配置反向代理至内网服务，无需暴露后端端口，解决 TLS / WSS 兼容性问题。
  2. **清理冗余逻辑**：
     - 移除无用的同步 `try...catch` 降级死代码，保持 WebSocket 连接与事件监听生命周期清晰健壮。

---

## 🛠️ 性能测试与编译验证

所有上述优化均已通过严苛的静态类型检查（`tsc --noEmit`）与 Vite 生产打包验证：

```bash
# 静态类型与语法检查
npm run lint

# 生产环境打包验证
npm run build
```
