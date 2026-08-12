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

## 🛠️ 性能测试与编译验证

所有上述优化均已通过严苛的静态类型检查（`tsc --noEmit`）与 Vite 生产打包验证：

```bash
# 静态类型与语法检查
npm run lint

# 生产环境打包验证
npm run build
```
