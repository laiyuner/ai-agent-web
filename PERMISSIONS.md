# AgentForge 全链路权限控制规范与架构设计文档 (PERMISSIONS.md)

本文档系统阐述 AgentForge 平台从**用户登录认证**、**路由导航栏控制**、**视图与按钮级细粒度控制**，到**底层数据接口与 Store 拦截**的全链路 RBAC 权限控制体系与执行标准。

---

## 一、权限体系设计总览

AgentForge 采用业界标准的 **RBAC (Role-Based Access Control) + 细粒度权限字符 (Permission Codes)** 双层鉴权模型：
1. **身份认证 (Authentication)**：基于纯内存 JWT Access Token 与 HttpOnly Refresh Token 机制，杜绝 LocalStorage XSS 令牌失窃风险。
2. **角色定义 (Roles)**：系统内置三大基准角色：
   - **`ADMIN`（超级管理员）**：平台全局掌控，自动拥有全量权限，负责用户运维、权限矩阵与密钥配置。
   - **`DEVELOPER`（开发者）**：负责业务开发，可自主创建/编排工作流、特化 Agent、连接 MCP 服务及调度执行。
   - **`VIEWER`（审计访客）**：纯只读访客，可审计工作流拓扑、实时推流监控及 Token 消耗日志，禁止所有写操作。
3. **权限判定唯一事实来源 (Single Source of Truth)**：
   - 登录及会话恢复时，后端统一返回用户拥有的权限字符列表 `permissions: string[]`。
   - 前端权限模块统一封装于 `src/permission.ts`，任何权限判定均依赖此权限字符集。

---

## 二、全链路权限控制流程

```
[ 用户登录 /api/v1/auth/login ]
            │
            ▼
[ Token 管理器 (tokenManager) ] ──> 注入内存 Access Token
            │
            ▼
[ 用户与权限信息挂载 ] ──> currentUser / permissions: string[]
            │
            ├──> [ 首次登录强制改密检测 (mustResetPassword) ] ──> 弹出 ChangePasswordModal 拦截
            │
            ├──> [ 路由前置守卫 (router.beforeEach) ] ──> 页面级路由拦截与 403 重定向
            │
            ├──> [ 侧边栏/导航栏 (MainLayout & Sidebar) ] ──> 菜单模块动态渲染/隐藏
            │
            ├──> [ 视图与按钮层 (v-permission / v-role) ] ──> 高危操作按钮移除 / 只读降级
            │
            └──> [ 数据与 API 层 (checkPermissionAndNotify) ] ──> Store 变更前置拦截 + Axios 拦截
```

---

## 三、各层级权限控制详解

### 1. 登录认证与凭证管理 (Authentication & Login)
- **接口凭证下发**：
  - 登录成功返回 `{ accessToken, expiresIn, userInfo, permissions, mustResetPassword }`。
  - `tokenManager` 在纯内存变量中持有 `accessToken`，不写入 `localStorage`。
- **首次登录强制改密 (First-Login Password Reset)**：
  - 若 `mustResetPassword === true` 或用户状态为 `PASSWORD_RESET`，系统在挂载后由根组件 `App.vue` 强制弹出全屏改密模态框 `ChangePasswordModal`。
  - 用户必须通过安全强度校验（至少 8 位、大小写字母及数字混合）并成功调用 `PUT /api/v1/auth/me` 后方可继续操作。
- **无感静默刷新 (Silent Refresh)**：
  - 当页面被刷新（F5）或 Token 临近过期时，Axios 拦截器与路由守卫通过 `/api/v1/auth/refresh` 自动恢复用户状态与 `permissions` 权限矩阵。

### 2. 路由与导航栏控制 (Router & Navigation)
- **页面级路由守卫 (`src/router/index.ts`)**：
  - 路由元信息声明：`meta: { isPublic?: boolean, roles?: RoleType[], permissions?: string[] }`。
  - 访问未认证页面：自动拦截并携带 `query.redirect` 重定向至 `/login`。
  - 访问未授权管理页面（如 `/users`, `/roles`）：通过 `hasRole` 与 `hasAnyPermission` 拦截，弹出警告 Toast 并降级重定向回 `/dashboard`。
- **侧边栏与顶部导航动态渲染 (`src/layouts/MainLayout.vue`)**：
  - 导航菜单项根据用户拥有的权限字符动态过滤：
    - **开发中心 (Workflows, Agents, MCP Servers, LLM Providers)**：需具备对应 `*:read` 权限。
    - **系统运维 (User Management, Role Matrix)**：仅 `ADMIN` 或具备 `user:read`/`role:read` 权限时可见。
  - 无权访问的功能分组直接从 DOM 中移除，避免视觉干扰。

### 3. 视图与按钮级细粒度控制 (UI & Buttons)
- **Vue 自定义指令 (`src/permission.ts`)**：
  - `v-permission="'workflow:create'"`：无权用户在 DOM 挂载阶段直接移除该按钮。
  - `v-permission="['workflow:create', 'workflow:update']"`：支持数组 OR 匹配。
  - `v-role="'ADMIN'"`：基于角色类型的专属功能展示控制。
- **只读模式自动降级策略**：
  - **工作流列表 (`P05_WorkflowList.vue`)**：`VIEWER` 角色或无编辑权限用户，新建、克隆、删除及发布按钮隐藏；点击卡片仅允许“查看拓扑”。
  - **DAG 画布编辑器 (`P06_WorkflowEditor.vue`)**：只读模式下节点拖拽添加面板、保存修改、下线发布按钮禁用或移除，画布自动变为 Inspect 审计模式。
  - **Agent 抽屉 (`P09_AgentDrawer.vue`)**：无 `agent:update` 权限时，抽屉标题变更为“查看智能体配置”，表单项全部禁用（`disabled`），底部保存按钮移除。
  - **MCP 探针与 LLM 供应商**：无权时移除“测试连通性”、“修改密钥”、“删除服务”等高危触发项。

### 4. 数据层与 Store 状态拦截 (Data & API Action Guard)
- **前端 Store 前置保护**：
  - 在 `src/stores/useAppStore.ts` 的所有变更方法（如 `addWorkflow`, `updateAgent`, `deleteMcpServer`, `addUser` 等）入口处，均统一调用 `checkPermissionAndNotify(permissionCode)`。
  - 若用户越权调用，立刻阻止执行并弹出友好的 403 权限不足提示 Toast。
- **Axios 请求/响应拦截器 (`src/api/index.ts`)**：
  - 请求拦截器：自动为每个 API 请求注入 `Authorization: Bearer <token>` 请求头。
  - 响应拦截器：当后端返回 HTTP 403 权限拒绝或非零业务错误码时，统一捕获并向用户呈现具体的未授权原因，防止界面崩溃。

---

## 四、系统细粒度权限字符定义表 (26 项)

| 权限分类 | 权限字符 (Permission Code) | 权限中文描述 | ADMIN | DEVELOPER | VIEWER |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **工作流** | `workflow:read` | 查看工作流列表与拓扑详情 | ✅ | ✅ | ✅ |
| | `workflow:create` | 新建空白工作流 DAG | ✅ | ✅ | ❌ |
| | `workflow:update` | 编辑工作流节点、连线与发布状态 | ✅ | ✅ | ❌ |
| | `workflow:delete` | 删除工作流资产 | ✅ | ❌ | ❌ |
| | `workflow:clone` | 克隆/派生工作流副本 | ✅ | ✅ | ❌ |
| | `workflow:execute` | 提交执行或单步调试运行 | ✅ | ✅ | ❌ |
| **特化 Agent** | `agent:read` | 查看 Agent 智能体列表与配置 | ✅ | ✅ | ✅ |
| | `agent:create` | 创建并注册新智能体 | ✅ | ✅ | ❌ |
| | `agent:update` | 修改 System Prompt 及 MCP 绑定 | ✅ | ✅ | ❌ |
| | `agent:delete` | 删除智能体资产 | ✅ | ❌ | ❌ |
| | `agent:clone` | 克隆 Agent 副本 | ✅ | ✅ | ❌ |
| **MCP 工具服务** | `mcp_server:read` | 查看 MCP 服务器连接与工具白名单 | ✅ | ✅ | ✅ |
| | `mcp_server:create` | 注册并连接新的 MCP 进程/SSE 服务 | ✅ | ✅ | ❌ |
| | `mcp_server:update` | 修改 MCP 环境变量及工具授权 | ✅ | ✅ | ❌ |
| | `mcp_server:delete` | 断开并注销 MCP 工具服务器 | ✅ | ❌ | ❌ |
| | `mcp_server:test` | 发送 RPC 探针连通性握手测试 | ✅ | ✅ | ❌ |
| **LLM 供应商** | `llm_provider:read` | 查看支持的模型及 Endpoint 状态 | ✅ | ✅ | ✅ |
| | `llm_provider:update` | 配置/更新 API Key 与反向代理网关 | ✅ | ❌ | ❌ |
| | `llm_provider:test` | 发起 LLM 连接连通性测试 | ✅ | ❌ | ❌ |
| **执行监控** | `run:read` | 查看运行实例、拓扑状态与实时日志 | ✅ | ✅ | ✅ |
| | `run:terminate` | 强行终止正在推流的执行任务 | ✅ | ✅ | ❌ |
| **用户运维** | `user:read` | 查看平台成员账号列表 | ✅ | ❌ | ❌ |
| | `user:create` | 新增平台用户账号 | ✅ | ❌ | ❌ |
| | `user:update` | 修改成员资料及分配所属角色 | ✅ | ❌ | ❌ |
| | `user:delete` | 注销/冻结用户登录账号 | ✅ | ❌ | ❌ |
| | `user:reset_password` | 重置用户初始密码并标记需改密 | ✅ | ❌ | ❌ |
| **角色矩阵** | `role:read` | 查看系统内置角色与权限映射矩阵 | ✅ | ❌ | ❌ |

---

## 五、开发者使用指南

### 1. 在 Vue 模板中控制按钮显示
```vue
<template>
  <!-- 单权限判定 -->
  <button v-permission="'workflow:create'" @click="handleCreate">
    新建工作流
  </button>

  <!-- 多权限判定 (拥有任一权限即可) -->
  <button v-permission="['workflow:create', 'workflow:update']" @click="handleSave">
    保存工作流
  </button>

  <!-- 仅管理员专属控制 -->
  <div v-role="'ADMIN'">
    <button @click="handleDeleteUser">注销用户</button>
  </div>
</template>
```

### 2. 在 Script Setup 中编程式判定
```ts
import { hasPermission, checkPermissionAndNotify, PERMISSIONS } from '@/permission';

function onExecuteWorkflow() {
  // 校验并自动 Toast 告警
  if (!checkPermissionAndNotify(PERMISSIONS.WORKFLOW.EXECUTE)) {
    return;
  }
  // 正常业务逻辑
  doTrigger();
}
```
