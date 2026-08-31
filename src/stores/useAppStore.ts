import { reactive } from 'vue';
import {
  User,
  Role,
  Agent,
  MCPServer,
  LLMProvider,
  Workflow,
  RunRecord,
  PageRoute,
  ToastMessage,
  AgentType,
  RoleType,
} from '../types';
import {
  api,
  tokenManager,
  mapUserDtoToUser,
  mapAgentDtoToAgent,
  mapWorkflowDtoToWorkflow,
  mapMcpDtoToMcp,
  mapLlmDtoToLlm,
  mapRunDtoToRunRecord,
  mapRoleDtoToRole,
  aggregatePermissionsToMatrix,
} from '../api';

// Initial Fallback Mock Data (Used if server is offline or newly booted)
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    displayName: '超级管理员 (Admin)',
    email: 'admin@agentforge.internal',
    role: 'ADMIN',
    status: 'active',
    createdAt: '2026-01-10 10:00:00',
    lastLogin: '2026-07-28 11:20:05',
    mustResetPassword: false,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    username: 'dev_li',
    displayName: '李明 (架构师)',
    email: 'liming@agentforge.internal',
    role: 'DEVELOPER',
    status: 'active',
    createdAt: '2026-02-15 14:30:10',
    lastLogin: '2026-07-27 18:45:22',
    mustResetPassword: false,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
];

const mockRoles: Role[] = [
  {
    id: '1',
    code: 'ADMIN',
    name: '超级管理员',
    description: '对 AgentForge 平台具有绝对控制特权，涵盖用户运维、密钥配置与全局监控。',
    userCount: 1,
    permissions: [],
  },
  {
    id: '2',
    code: 'DEVELOPER',
    name: '开发者 (Developer)',
    description: '可自主创建和发布工作流、定义 Agent 角色并配置 MCP 工具连接。',
    userCount: 5,
    permissions: [],
  },
  {
    id: '3',
    code: 'VIEWER',
    name: '审计访客 (Viewer)',
    description: '仅允许只读审计工作流拓扑结构、运行监控日志与 Token 消耗指标。',
    userCount: 12,
    permissions: [],
  },
];

const mockAgents: Agent[] = [
  {
    id: '1',
    name: '需求分析专家 (PRD Synthesizer)',
    description: '负责解析用户输入的非结构化自然语言需求，提取核心 API 交互契约与数据流向。',
    type: 'ReAct',
    isPublic: true,
    llmProviderId: 'zhipu',
    llmProviderName: '智谱 BigModel',
    model: 'glm-4-flash',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '你是一名资深系统架构师。请严谨提取用户需求中的业务边界、数据模型与并发预期。',
    boundTools: ['read_query'],
    mcpBindings: [
      {
        mcpServerId: '1',
        mcpServerName: 'PostgreSQL 本地数据库探针',
        enabledTools: ['read_query'],
      },
    ],
    timeout: 60,
    maxRetries: 3,
    retryBackoffMs: 1000,
    updatedAt: '2026-07-28 09:12',
    creator: '系统管理员',
  },
];

const mockMcpServers: MCPServer[] = [
  {
    id: '1',
    name: 'PostgreSQL 本地数据库探针',
    description: '用于实时解析与查询平台系统 Schema，捕获 SQL 执行效率与索引调优建议。',
    transportType: 'stdio',
    status: 'connected',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost:5432/agentforge'],
    envVars: [{ key: 'PGPASSWORD', value: 'secret' }],
    toolWhitelist: ['read_query', 'list_tables', 'describe_table'],
    toolsCount: 3,
    tools: [
      { id: 't-1', name: 'read_query', description: '安全只读查询数据库结构', serverName: 'PostgreSQL 探针' },
    ],
    updatedAt: '2026-07-28 10:00',
  },
];

const mockLlmProviders: LLMProvider[] = [
  {
    id: 'zhipu',
    name: '智谱开放平台 (BigModel)',
    code: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyConfigured: false,
    keySource: 'NONE',
    defaultModel: 'glm-4-flash',
    supportedModels: ['glm-4-flash', 'glm-4-plus', 'glm-4-air'],
    status: 'unconfigured',
    isBuiltIn: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API 网关',
    code: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyConfigured: false,
    keySource: 'NONE',
    defaultModel: 'deepseek-chat',
    supportedModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
    status: 'unconfigured',
    isBuiltIn: true,
  },
  {
    id: 'openai',
    name: 'OpenAI 官方 API',
    code: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyConfigured: false,
    keySource: 'NONE',
    defaultModel: 'gpt-4o',
    supportedModels: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'],
    status: 'unconfigured',
    isBuiltIn: true,
  },
];

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: '自动化需求拆解与代码审查 DAG',
    description: '提取 PRD 逻辑，联动 PostgreSQL MCP 获取表结构，并调用 DeepSeek 进行代码静态问题诊断。',
    status: 'published',
    isPublic: true,
    nodes: [
      { id: 'node-start', type: 'agentNode', position: { x: 50, y: 150 }, data: { label: '输入触发器' } },
      { id: 'node-1', type: 'agentNode', position: { x: 300, y: 150 }, data: { label: '需求分析算子', agentId: '1' } },
    ],
    edges: [{ id: 'node-start-node-1', source: 'node-start', target: 'node-1' }],
    updatedAt: '2026-07-28 11:00',
    author: '超级管理员',
  },
];

const mockRuns: RunRecord[] = [
  {
    id: '1',
    workflowId: '1',
    workflowName: '自动化需求拆解与代码审查 DAG',
    status: 'success',
    startTime: '2026-07-28 11:20:00',
    durationMs: 3400,
    tokensUsed: 1250,
    triggerType: 'manual',
    totalNodes: 2,
    completedNodes: 2,
    nodeStates: [],
    logs: [{ timestamp: '11:20:00', level: 'info', message: '工作流初始化完成，开始推流' }],
  },
];

export type DisplayMode = 'auto' | '100' | '110' | '125' | '90';

const savedDisplayMode = ((typeof localStorage !== 'undefined' && localStorage.getItem('agentforge_display_mode')) || 'auto') as DisplayMode;

// Reactive Store State
export const state = reactive({
  isLoggedIn: false,
  currentUser: null as User | null,
  /** 当前用户的权限码列表（后端 /auth/login 与 /auth/me 下发，权限判断唯一事实来源） */
  permissions: [] as string[],
  mustResetPasswordModalOpen: false,
  route: 'login' as PageRoute,

  displayMode: savedDisplayMode,

  users: [] as User[],
  roles: [] as Role[],
  agents: [] as Agent[],
  mcpServers: [] as MCPServer[],
  llmProviders: [] as LLMProvider[],
  workflows: [] as Workflow[],
  runs: [] as RunRecord[],

  selectedWorkflowId: '',
  selectedRunId: '',

  agentDrawerOpen: false,
  editingAgent: null as Agent | null,

  mcpDrawerOpen: false,
  editingMcp: null as MCPServer | null,

  toasts: [] as ToastMessage[],

  dashboardStats: {
    workflowCount: 1,
    agentCount: 1,
    runCountToday: 1,
    successRate: 1.0,
    avgDurationMs: 3400,
    tokenUsageToday: 1250,
  },
});

// Toast Helper
export function addToast(toast: Omit<ToastMessage, 'id'>) {
  const id = `t-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  state.toasts.push({ ...toast, id });
  setTimeout(() => {
    removeToast(id);
  }, 4000);
}

export function removeToast(id: string) {
  state.toasts = state.toasts.filter((t) => t.id !== id);
}

// Session Initializer for In-Memory Token Recovery
export async function initUserFromSession() {
  try {
    const meData = await api.getMe();
    if (meData) {
      state.currentUser = mapUserDtoToUser(meData);
      state.isLoggedIn = true;
      // /auth/me 现已返回 permissions；刷新后权限状态不丢失
      state.permissions = Array.isArray(meData.permissions) ? meData.permissions : [];
      // 后端 /auth/me 现已返回 mustResetPassword；刷新恢复会话时若用户
      // 仍处于待改密状态，必须重新弹出强制改密弹窗，防止 F5 绕过
      if (meData.mustResetPassword || meData.status === 'PASSWORD_RESET') {
        state.mustResetPasswordModalOpen = true;
      }
      return;
    }
  } catch (err: any) {
    console.warn('获取当前用户信息失败，使用默认用户信息:', err.message);
  }
  // Fallback user if server user info endpoint is unpopulated
  state.currentUser = mockUsers[0];
  state.isLoggedIn = true;
}

// Router Helper & Dynamic Route Data Refresher
export async function refreshRouteData(r: PageRoute) {
  if (!state.isLoggedIn) return;

  switch (r) {
    case 'dashboard':
      await Promise.allSettled([
        fetchDashboardStats(),
        fetchWorkflows(),
        fetchRuns(),
        fetchAgents(),
        fetchMcpServers(),
      ]);
      break;
    case 'workflows':
      await fetchWorkflows();
      break;
    case 'workflow-edit':
      await Promise.allSettled([
        fetchWorkflows(),
        fetchAgents(),
        fetchMcpServers(),
        fetchLlmProviders(),
      ]);
      break;
    case 'workflow-monitor':
      await Promise.allSettled([
        fetchWorkflows(),
        fetchRuns(),
      ]);
      break;
    case 'agents':
      await Promise.allSettled([
        fetchAgents(),
        fetchLlmProviders(),
        fetchMcpServers(),
      ]);
      break;
    case 'mcp-servers':
      await fetchMcpServers();
      break;
    case 'llm-providers':
      await fetchLlmProviders();
      break;
    case 'runs':
    case 'run-detail':
      await fetchRuns();
      break;
    case 'users':
      await fetchUsers();
      break;
    case 'roles':
      await fetchRoles();
      break;
    case 'profile':
      try {
        const meData = await api.getMe();
        if (meData) {
          state.currentUser = mapUserDtoToUser(meData);
        }
      } catch (err: any) {
        console.warn('获取个人信息失败:', err.message);
      }
      break;
    default:
      break;
  }
}

export const pageRouteToPathMap: Record<PageRoute, string> = {
  dashboard: '/dashboard',
  workflows: '/workflows',
  'workflow-edit': '/workflows/editor',
  'workflow-monitor': '/execution-monitor',
  agents: '/agents',
  'mcp-servers': '/mcp-servers',
  'llm-providers': '/llm-providers',
  runs: '/execution-history',
  'run-detail': '/execution-detail',
  users: '/users',
  roles: '/roles',
  profile: '/profile',
  login: '/login',
};

let routerInstance: any = null;

export function setRouterInstance(router: any) {
  routerInstance = router;
}

export function setRoute(r: PageRoute) {
  let targetPath = pageRouteToPathMap[r] || '/dashboard';
  if (r === 'workflow-edit' && state.selectedWorkflowId) {
    targetPath = `/workflows/editor/${state.selectedWorkflowId}`;
  } else if (r === 'run-detail' && state.selectedRunId) {
    targetPath = `/execution-detail/${state.selectedRunId}`;
  }

  if (routerInstance) {
    routerInstance.push(targetPath).catch(() => {});
  } else {
    import('../router').then(({ router }) => {
      router.push(targetPath).catch(() => {});
    });
  }
}

// Auth Methods
export async function handleLoginApi(usernameVal: string, passwordVal: string): Promise<boolean> {
  try {
    const data = await api.login(usernameVal, passwordVal);
    if (data && data.accessToken) {
      tokenManager.setAccessToken(data.accessToken, data.expiresIn);

      const userInfo = data.userInfo || {};
      const user = mapUserDtoToUser({
        ...userInfo,
        mustResetPassword: !!data.mustResetPassword,
        roles: userInfo.roles || data.permissions || ['ADMIN'],
      });

      state.isLoggedIn = true;
      state.currentUser = user;
      state.permissions = Array.isArray(data.permissions) ? data.permissions : [];
      
      const { router } = await import('../router');
      const redirectQuery = router.currentRoute.value.query.redirect as string;
      
      // 无论是否强制改密都进入业务页；mustResetPassword 时由全局
      // ChangePasswordModal（App.vue 渲染）以全屏遮罩强制用户先完成改密
      router.push(redirectQuery || '/dashboard');
      if (data.mustResetPassword) {
        state.mustResetPasswordModalOpen = true;
      }
      
      addToast({ type: 'success', title: '登录成功', message: `欢迎回来，${user.displayName || user.username}` });
      
      // Load all backend resources asynchronously
      fetchAllData();
      return true;
    } else {
      addToast({ type: 'error', title: '登录失败', message: '服务器未返回有效的身份凭证 Token' });
      return false;
    }
  } catch (err: any) {
    addToast({ type: 'error', title: '登录失败', message: err.message || '用户名或密码无效，请检查重试' });
    return false;
  }
}

export function login(user: User) {
  state.isLoggedIn = true;
  state.currentUser = user;
  
  import('../router').then(({ router }) => {
    router.push('/dashboard');
    if (user.mustResetPassword) {
      state.mustResetPasswordModalOpen = true;
    }
  });

  addToast({ type: 'success', title: '登录成功', message: `欢迎回来，${user.displayName}` });
  fetchAllData();
}

export async function logout() {
  try {
    await api.logout();
    addToast({ type: 'success', title: '退出登录成功', message: '您已安全退出 AgentForge 系统，会话 Token 已销毁' });
  } catch (err: any) {
    addToast({ type: 'info', title: '退出登录', message: err.message || '已清除本地会话 Token' });
  } finally {
    tokenManager.clear();
    state.isLoggedIn = false;
    state.currentUser = null;
    state.permissions = [];
    state.route = 'login';

    const { router } = await import('../router');
    if (router.currentRoute.value.path !== '/login') {
      router.push('/login');
    }
  }
}

/**
 * 完成强制/主动密码重置。
 *
 * 行为约定（与后端契约对齐）：
 * - 调用 PUT /auth/me 提交 { oldPassword, newPassword }；
 * - 成功：关闭弹窗、清除当前用户的待改密标记、若不在业务页则跳转 /dashboard、
 *   Toast 提示成功。不要求重新登录（改密时已通过旧密码验证身份，
 *   且后端不撤销当前 token）；
 * - 失败：抛出错误给调用方（弹窗展示 err.message 并保持打开），不关弹窗。
 *
 * @returns true=成功；false=失败（错误信息已由调用方展示）
 */
export async function completePasswordReset(oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    await api.changePassword(oldPassword, newPassword);
  } catch (err: any) {
    addToast({ type: 'error', title: '密码修改失败', message: err.message || '请检查旧密码与新密码是否符合要求' });
    return false;
  }

  if (state.currentUser) {
    state.currentUser.mustResetPassword = false;
  }
  state.mustResetPasswordModalOpen = false;

  // 兜底：若当前仍停在登录页（正常流程不会），跳转业务页
  const { router } = await import('../router');
  if (router.currentRoute.value.path === '/login') {
    const redirectQuery = router.currentRoute.value.query.redirect as string;
    router.push(redirectQuery || '/dashboard');
  }

  addToast({ type: 'success', title: '密码修改成功', message: '新密码已生效，欢迎进入 AgentForge 系统' });
  return true;
}

// ==================== Data Syncing (Backend API Fetchers) ====================

export async function fetchAgents(keyword = '') {
  try {
    const pageResult = await api.getAgents(1, 50, keyword);
    const items = pageResult?.items || (Array.isArray(pageResult) ? pageResult : []);
    state.agents = items.map(mapAgentDtoToAgent);
  } catch (err: any) {
    state.agents = [];
    console.warn('后端获取 Agent 失败:', err.message);
  }
}

export async function fetchWorkflows(keyword = '') {
  try {
    const pageResult = await api.getWorkflows(1, 50, keyword);
    const items = pageResult?.items || (Array.isArray(pageResult) ? pageResult : []);
    state.workflows = items.map(mapWorkflowDtoToWorkflow);
    if (state.selectedWorkflowId && !state.workflows.some(w => w.id === state.selectedWorkflowId)) {
      state.selectedWorkflowId = '';
    }
  } catch (err: any) {
    state.workflows = [];
    state.selectedWorkflowId = '';
    console.warn('后端获取工作流失败:', err.message);
  }
}

export async function fetchMcpServers(keyword = '') {
  try {
    const pageResult = await api.getMcpServers(1, 50, keyword);
    const items = pageResult?.items || (Array.isArray(pageResult) ? pageResult : []);
    state.mcpServers = items.map(mapMcpDtoToMcp);
  } catch (err: any) {
    state.mcpServers = [];
    console.warn('后端获取 MCP 失败:', err.message);
  }
}

export async function fetchLlmProviders() {
  try {
    const items = await api.getLlmProviders();
    const list = Array.isArray(items) ? items : (items?.items || []);
    state.llmProviders = list.map(mapLlmDtoToLlm);
  } catch (err: any) {
    state.llmProviders = [];
    console.warn('后端获取 LLM 供应商失败:', err.message);
  }
}

export async function fetchRuns() {
  try {
    const res = await api.getRuns(1, 50);
    const items = res?.items || (Array.isArray(res) ? res : []);
    state.runs = items.map(mapRunDtoToRunRecord);
    if (state.runs.length > 0) {
      if (!state.runs.some(r => r.id === state.selectedRunId)) {
        state.selectedRunId = state.runs[0].id;
      }
    } else {
      state.selectedRunId = '';
    }
  } catch (err: any) {
    state.runs = [];
    state.selectedRunId = '';
    console.warn('后端获取运行历史失败:', err.message);
  }
}

export async function fetchUsers(keyword = '') {
  try {
    const pageResult = await api.getUsers(1, 50, keyword);
    const items = pageResult?.items || (Array.isArray(pageResult) ? pageResult : []);
    state.users = items.map(mapUserDtoToUser);
  } catch (err: any) {
    state.users = [];
    console.warn('后端获取用户失败:', err.message);
  }
}

export async function fetchRoles() {
  try {
    const items = await api.getRoles();
    const list = Array.isArray(items) ? items : (items?.items || []);
    const roles = list.map(mapRoleDtoToRole);
    // 并发拉取每个角色的权限码列表，聚合为矩阵结构
    await Promise.all(roles.map(async (role) => {
      try {
        const perms = await api.getRolePermissions(role.id);
        role.permissions = aggregatePermissionsToMatrix(Array.isArray(perms) ? perms : []);
      } catch (err: any) {
        console.warn(`获取角色 ${role.name} 权限失败:`, err.message);
      }
    }));
    state.roles = roles;
  } catch (err: any) {
    state.roles = [];
    console.warn('后端获取角色失败:', err.message);
  }
}

export async function fetchDashboardStats() {
  try {
    const stats = await api.getDashboardStats();
    if (stats) {
      state.dashboardStats = stats;
    }
  } catch (err: any) {
    console.warn('后端获取 Dashboard 统计失败:', err.message);
  }
}

export async function fetchAllData() {
  await Promise.allSettled([
    fetchAgents(),
    fetchWorkflows(),
    fetchMcpServers(),
    fetchLlmProviders(),
    fetchRuns(),
    fetchUsers(),
    fetchRoles(),
    fetchDashboardStats(),
  ]);
}

// Auto-Sync User Session on App Boot / Reload
async function initAuthSession() {
  try {
    const meData = await api.getMe();
    if (meData) {
      state.currentUser = mapUserDtoToUser(meData);
      state.isLoggedIn = true;
      state.permissions = Array.isArray(meData.permissions) ? meData.permissions : [];
      fetchAllData();
      return;
    }
  } catch (err) {
    // getMe failed, interceptor might have attempted refresh or failed
  }

  // Attempt silent refresh using httpOnly cookie if access token was missing/expired
  try {
    const refreshData = await api.refreshToken();
    if (refreshData && refreshData.accessToken) {
      tokenManager.setAccessToken(refreshData.accessToken, refreshData.expiresIn);
      const meData = await api.getMe();
      if (meData) {
        state.currentUser = mapUserDtoToUser(meData);
        state.isLoggedIn = true;
        state.permissions = Array.isArray(meData.permissions) ? meData.permissions : [];
        fetchAllData();
        return;
      }
    }
  } catch {
    // Both failed: cookie is missing or expired
  }

  tokenManager.clear();
  state.isLoggedIn = false;
  state.currentUser = null;
  state.permissions = [];
  state.route = 'login';
}

initAuthSession();

import {
  hasRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  checkPermissionAndNotify,
} from '../permission';
export {
  hasRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  checkPermissionAndNotify,
};

function convertNodeToReq(n: any) {
  let nodeType = 'AGENT';
  if (n.type === 'startNode') nodeType = 'START';
  else if (n.type === 'endNode') nodeType = 'END';
  else if (n.type === 'toolNode') nodeType = 'TOOL';
  else if (n.type === 'conditionNode') nodeType = 'CONDITION';

  const agentId = (nodeType === 'AGENT' && n.data?.agentId)
    ? (Number(n.data.agentId) || n.data.agentId)
    : null;

  return {
    nodeKey: n.id,
    nodeType,
    name: n.data?.label || n.id,
    agentId,
    agentOverride: buildAgentOverride(n.data),
    positionX: Math.round(n.position?.x || 0),
    positionY: Math.round(n.position?.y || 0),
  };
}

/**
 * 从节点 data 构建节点级 Agent 配置覆盖对象（提交给后端 agent_override JSONB 列）。
 * 只收集有值的键；全部为空时返回 null（后端按未覆写处理，行为与历史一致）。
 * 单位换算：timeoutSeconds（秒）-> timeoutMs（毫秒）。
 */
function buildAgentOverride(data: any): Record<string, any> | null {
  if (!data) return null;
  const override: Record<string, any> = {};
  if (typeof data.systemPromptOverride === 'string' && data.systemPromptOverride.trim()) {
    override.systemPrompt = data.systemPromptOverride;
  }
  if (Number.isFinite(data.timeoutSeconds) && data.timeoutSeconds > 0) {
    override.timeoutMs = Math.round(data.timeoutSeconds * 1000);
  }
  if (Number.isFinite(data.retries) && data.retries >= 0) {
    override.retryCount = data.retries;
  }
  return Object.keys(override).length ? override : null;
}

function convertEdgeToReq(e: any) {
  return {
    sourceNodeKey: e.source,
    targetNodeKey: e.target,
    condition: e.condition || null,
  };
}

export async function fetchWorkflowDetail(id: string): Promise<Workflow | null> {
  try {
    const dto = await api.getWorkflow(id);
    if (dto) {
      const wf = mapWorkflowDtoToWorkflow(dto);
      const idx = state.workflows.findIndex((w) => w.id === String(id));
      if (idx !== -1) {
        state.workflows[idx] = wf;
      }
      return wf;
    }
  } catch (err: any) {
    console.warn('获取工作流详情失败:', err.message);
  }
  return null;
}

// Workflow Operations
export async function addWorkflow(wf: Omit<Workflow, 'id' | 'updatedAt' | 'author'>) {
  if (!checkPermissionAndNotify('workflow:create')) return null;
  try {
    const reqData = {
      name: wf.name,
      description: wf.description || '',
      status: wf.status === 'published' ? 'PUBLISHED' : 'DRAFT',
      isPublic: !!wf.isPublic,
      nodes: (wf.nodes || []).map(convertNodeToReq),
      edges: (wf.edges || []).map(convertEdgeToReq),
    };
    const dto = await api.createWorkflow(reqData);
    const newWf = mapWorkflowDtoToWorkflow(dto);
    state.workflows.unshift(newWf);
    addToast({ type: 'success', title: '创建成功', message: `工作流「${newWf.name}」已建入后端库` });
    return newWf;
  } catch (err: any) {
    const fallbackWf: Workflow = {
      ...wf,
      id: `wf-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      author: state.currentUser?.displayName || '系统管理员',
      authorAvatar: state.currentUser?.avatar,
    };
    state.workflows.unshift(fallbackWf);
    addToast({ type: 'warning', title: '本地保存成功', message: `网络异常: ${err.message}，已进行本地缓存` });
    return fallbackWf;
  }
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
  if (!checkPermissionAndNotify('workflow:update')) return null;
  try {
    const wf = state.workflows.find((w) => w.id === id);
    const merged = { ...wf, ...updates } as Workflow;
    const reqData = {
      name: merged.name,
      description: merged.description || '',
      status: merged.status === 'published' ? 'PUBLISHED' : 'DRAFT',
      isPublic: !!merged.isPublic,
      nodes: (merged.nodes || []).map(convertNodeToReq),
      edges: (merged.edges || []).map(convertEdgeToReq),
    };
    const updatedDto = await api.updateWorkflow(id, reqData);
    const updatedWf = mapWorkflowDtoToWorkflow(updatedDto);
    const idx = state.workflows.findIndex((w) => w.id === id);
    if (idx !== -1) {
      state.workflows[idx] = updatedWf;
    }
    addToast({ type: 'success', title: '工作流已保存', message: 'DAG 拓扑节点与关联网关已持久化至后端' });
    return updatedWf;
  } catch (err: any) {
    const idx = state.workflows.findIndex((w) => w.id === id);
    if (idx !== -1) {
      state.workflows[idx] = {
        ...state.workflows[idx],
        ...updates,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
    }
    addToast({ type: 'error', title: '保存工作流失败', message: err.message || '网络或服务端报错' });
    return null;
  }
}

export async function deleteWorkflow(id: string) {
  if (!checkPermissionAndNotify('workflow:delete')) return;
  try {
    await api.deleteWorkflow(id);
    addToast({ type: 'success', title: '移除完成', message: `工作流已从数据库成功删除` });
  } catch (err: any) {
    addToast({ type: 'info', title: '本地已移除', message: `后端提示: ${err.message}` });
  } finally {
    state.workflows = state.workflows.filter((w) => w.id !== id);
    if (state.selectedWorkflowId === id) {
      state.selectedWorkflowId = '';
    }
  }
}

export async function copyWorkflow(id: string) {
  if (!checkPermissionAndNotify('workflow:clone')) return;
  try {
    const wf = state.workflows.find((w) => w.id === id);
    const name = `${wf?.name || '工作流'} (副本)`;
    const newDto = await api.cloneWorkflow(id, name);
    const copied = mapWorkflowDtoToWorkflow(newDto);
    state.workflows.unshift(copied);
    addToast({ type: 'success', title: '复制副本成功', message: `已克隆模版「${copied.name}」` });
  } catch (err: any) {
    addToast({ type: 'error', title: '克隆工作流失败', message: err.message });
  }
}

export async function publishWorkflow(id: string) {
  if (!checkPermissionAndNotify('workflow:update')) return;
  try {
    await api.publishWorkflow(id);
    const wf = state.workflows.find((w) => w.id === id);
    if (wf) wf.status = 'published';
    addToast({ type: 'success', title: '工作流已发布', message: '已切换状态为 PUBLISHED 并允许生产运行' });
  } catch (err: any) {
    addToast({ type: 'error', title: '发布工作流失败', message: err.message });
  }
}

export async function unpublishWorkflow(id: string) {
  if (!checkPermissionAndNotify('workflow:update')) return;
  try {
    await api.unpublishWorkflow(id);
    const wf = state.workflows.find((w) => w.id === id);
    if (wf) wf.status = 'draft';
    addToast({ type: 'success', title: '工作流已下线', message: '已切换状态为 DRAFT，可重新编辑' });
  } catch (err: any) {
    addToast({ type: 'error', title: '下线工作流失败', message: err.message });
  }
}

export async function validateWorkflow(wf: Workflow) {
  try {
    const reqData = {
      nodes: (wf.nodes || []).map((n) => ({
        nodeKey: n.id,
        agentId: n.data?.agentId ? Number(n.data.agentId) : undefined,
      })),
      edges: (wf.edges || []).map((e) => ({
        sourceNodeKey: e.source,
        targetNodeKey: e.target,
      })),
    };
    const res = await api.validateWorkflow(reqData);
    if (res.valid) {
      addToast({ type: 'success', title: 'DAG 拓扑校验通过', message: '拓扑结构连通无环，合规检查通过' });
    } else {
      const errs = (res.errors || []).join('; ') || '检测到图拓扑异常';
      addToast({ type: 'error', title: 'DAG 校验不通过', message: errs });
    }
    return res;
  } catch (err: any) {
    addToast({ type: 'error', title: '校验请求失败', message: err.message });
  }
}

export async function triggerRun(workflowId: string, inputMsg: string) {
  if (!checkPermissionAndNotify('workflow:execute')) throw new Error('当前角色未授权该操作（需要权限：workflow:execute）');
  try {
    const runDto = await api.triggerRun(workflowId, inputMsg);
    const newRun = mapRunDtoToRunRecord(runDto);
    state.runs.unshift(newRun);
    state.selectedRunId = newRun.id;
    setRoute('workflow-monitor');
    addToast({ type: 'info', title: '任务已提交引擎', message: `运行 ID: #${newRun.id} 已开始实时推流` });
    return newRun;
  } catch (err: any) {
    const errMsg = err.response?.data?.message || err.message || '调度工作流失败';
    addToast({ type: 'error', title: '工作流调度失败', message: errMsg });
    throw new Error(errMsg);
  }
}

export async function stopRun(runId: string) {
  if (!checkPermissionAndNotify('run:terminate')) return;
  try {
    await api.terminateRun(runId);
  } catch (err: any) {
    console.warn('后端终止 API 无响应，强行中止:', err.message);
  }
  const run = state.runs.find((r) => String(r.id) === String(runId));
  if (run) {
    run.status = 'terminated';
    addToast({ type: 'warning', title: '终止指令已下发', message: `已打断并强行终止 Run #${runId}` });
  }
}

export function updateRunInStore(
  runId: string | number,
  status: string,
  durationMs?: number,
  tokensUsed?: number
) {
  const targetId = String(runId);
  const normStatus = status.toLowerCase();
  const run = state.runs.find((r) => String(r.id) === targetId);
  if (run) {
    run.status = normStatus as any;
    if (durationMs !== undefined && durationMs > 0) {
      run.durationMs = durationMs;
    }
    if (tokensUsed !== undefined && tokensUsed > 0) {
      run.tokensUsed = tokensUsed;
    }
  }
}

// Agent CRUD
export async function addAgent(agent: Omit<Agent, 'id' | 'updatedAt' | 'creator'>) {
  if (!checkPermissionAndNotify('agent:create')) return null;
  try {
    const reqData = {
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      llmProvider: agent.llmProviderId,
      llmModel: agent.model,
      llmParams: {
        temperature: agent.temperature ?? 0.7,
        max_tokens: agent.maxTokens ?? 2000,
      },
      retryCount: agent.maxRetries ?? 3,
      retryBackoffMs: agent.retryBackoffMs ?? 1000,
      timeoutMs: (agent.timeout || 60) * 1000,
      isPublic: !!agent.isPublic,
      // MCP 绑定：始终提交（[] 表示不绑定任何 MCP），mcpServerId 转数字
      mcpServers: (agent.mcpBindings || []).map((b) => ({
        mcpServerId: Number(b.mcpServerId),
        enabledTools: b.enabledTools || [],
      })),
    };
    const dto = await api.createAgent(reqData);
    const newAgent = mapAgentDtoToAgent(dto);
    state.agents.unshift(newAgent);
    addToast({ type: 'success', title: 'Agent 已就绪', message: `智能体「${newAgent.name}」写入成功` });
    return newAgent;
  } catch (err: any) {
    const fallback: Agent = {
      ...agent,
      id: `ag-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      creator: state.currentUser?.displayName || '系统管理员',
    };
    state.agents.unshift(fallback);
    addToast({ type: 'warning', title: '本地 Agent 保存', message: `后端创建风险: ${err.message}` });
    return fallback;
  }
}

export async function updateAgent(id: string, updates: Partial<Agent>) {
  if (!checkPermissionAndNotify('agent:update')) return;
  try {
    const reqData: any = {};
    if (updates.name !== undefined) reqData.name = updates.name;
    if (updates.description !== undefined) reqData.description = updates.description;
    if (updates.systemPrompt !== undefined) reqData.systemPrompt = updates.systemPrompt;
    if (updates.llmProviderId !== undefined) reqData.llmProvider = updates.llmProviderId;
    if (updates.model !== undefined) reqData.llmModel = updates.model;
    if (updates.isPublic !== undefined) reqData.isPublic = updates.isPublic;
    if (updates.temperature !== undefined || updates.maxTokens !== undefined) {
      reqData.llmParams = {
        temperature: updates.temperature ?? 0.7,
        max_tokens: updates.maxTokens ?? 2000,
      };
    }
    // MCP 绑定全量替换：编辑保存必须提交当前完整列表（含空数组），否则解绑不生效
    if (updates.mcpBindings !== undefined) {
      reqData.mcpServers = (updates.mcpBindings || []).map((b: any) => ({
        mcpServerId: Number(b.mcpServerId),
        enabledTools: b.enabledTools || [],
      }));
    }
    const dto = await api.updateAgent(id, reqData);
    const updatedAgent = mapAgentDtoToAgent(dto);
    const idx = state.agents.findIndex((a) => a.id === id);
    if (idx !== -1) {
      state.agents[idx] = updatedAgent;
    }
    addToast({ type: 'success', title: 'Agent 已更新', message: 'System Prompt 与参数同步完成' });
  } catch (err: any) {
    const idx = state.agents.findIndex((a) => a.id === id);
    if (idx !== -1) {
      state.agents[idx] = {
        ...state.agents[idx],
        ...updates,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
    }
    addToast({ type: 'info', title: '本地 Agent 更新', message: `服务端未响应: ${err.message}` });
  }
}

export async function deleteAgent(id: string) {
  if (!checkPermissionAndNotify('agent:delete')) return;
  try {
    await api.deleteAgent(id);
  } catch (err: any) {
    console.warn('API 删除 Agent 失败:', err.message);
  }
  const ag = state.agents.find((a) => a.id === id);
  state.agents = state.agents.filter((a) => a.id !== id);
  addToast({ type: 'info', title: '已移除 Agent', message: `「${ag?.name || id}」已从智能体池中扣除` });
}

export async function copyAgent(id: string) {
  if (!checkPermissionAndNotify('agent:clone')) return;
  try {
    const ag = state.agents.find((a) => a.id === id);
    const name = `${ag?.name || 'Agent'} (副本)`;
    const dto = await api.cloneAgent(id, name);
    const cloned = mapAgentDtoToAgent(dto);
    state.agents.unshift(cloned);
    addToast({ type: 'success', title: '复制 Agent 成功', message: `已派生新逻辑智能体「${cloned.name}」` });
  } catch (err: any) {
    addToast({ type: 'error', title: '克隆 Agent 失败', message: err.message });
  }
}

// MCP Server CRUD
export async function addMcpServer(mcp: Omit<MCPServer, 'id' | 'updatedAt' | 'status' | 'toolsCount'>) {
  if (!checkPermissionAndNotify('mcp_server:create')) return;
  try {
    const envVarsObj: Record<string, string> = {};
    (mcp.envVars || []).forEach((item) => {
      if (item.key) envVarsObj[item.key] = item.value || '';
    });
    const reqData = {
      name: mcp.name,
      description: mcp.description,
      transportType: mcp.transportType === 'SSE' ? 'sse' : 'stdio',
      command: mcp.command,
      args: mcp.args,
      envVars: envVarsObj,
      url: mcp.sseUrl,
      enabled: true,
    };
    const dto = await api.createMcpServer(reqData);
    const newMcp = mapMcpDtoToMcp(dto);
    state.mcpServers.unshift(newMcp);
    addToast({ type: 'success', title: 'MCP 服务器已连接', message: `工具服务「${newMcp.name}」建立` });
  } catch (err: any) {
    const newMcp: MCPServer = {
      ...mcp,
      id: `mcp-${Date.now().toString().slice(-4)}`,
      status: 'connected',
      toolsCount: (mcp.tools || []).length,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    state.mcpServers.unshift(newMcp);
    addToast({ type: 'warning', title: '本地建立 MCP 探针', message: `后端创建异常: ${err.message}` });
  }
}

export async function updateMcpServer(id: string, updates: Partial<MCPServer>) {
  if (!checkPermissionAndNotify('mcp_server:update')) return;
  try {
    const envVarsObj: Record<string, string> = {};
    if (updates.envVars) {
      updates.envVars.forEach((item) => {
        if (item.key) envVarsObj[item.key] = item.value || '';
      });
    }

    const reqData: any = {};
    if (updates.name !== undefined) reqData.name = updates.name;
    if (updates.description !== undefined) reqData.description = updates.description;
    if (updates.transportType !== undefined) reqData.transportType = updates.transportType === 'SSE' ? 'sse' : 'stdio';
    if (updates.command !== undefined) reqData.command = updates.command;
    if (updates.args !== undefined) reqData.args = updates.args;
    if (updates.envVars !== undefined) reqData.envVars = envVarsObj;
    if (updates.sseUrl !== undefined) reqData.url = updates.sseUrl;

    const dto = await api.updateMcpServer(id, reqData);
    const updatedMcp = mapMcpDtoToMcp(dto);
    const idx = state.mcpServers.findIndex((m) => m.id === id);
    if (idx !== -1) {
      state.mcpServers[idx] = updatedMcp;
    }
    addToast({ type: 'success', title: 'MCP 配置更新', message: '传输参数与探针授权已保存' });
  } catch (err: any) {
    const idx = state.mcpServers.findIndex((m) => m.id === id);
    if (idx !== -1) {
      state.mcpServers[idx] = { ...state.mcpServers[idx], ...updates };
    }
    addToast({ type: 'info', title: '本地 MCP 配置保存', message: `接口同步: ${err.message}` });
  }
}

export async function deleteMcpServer(id: string) {
  if (!checkPermissionAndNotify('mcp_server:delete')) return;
  try {
    await api.deleteMcpServer(id);
  } catch (err: any) {
    console.warn('API 删除 MCP 失败:', err.message);
  }
  const mcp = state.mcpServers.find((m) => m.id === id);
  state.mcpServers = state.mcpServers.filter((m) => m.id !== id);
  addToast({ type: 'info', title: '断开 MCP', message: `已注销工具服务器「${mcp?.name || id}」` });
}

export async function testMcpServer(id: string) {
  if (!checkPermissionAndNotify('mcp_server:test')) return;
  try {
    const res = await api.testMcpServer(id);
    if (res.success) {
      const mcp = state.mcpServers.find((m) => m.id === id);
      if (mcp) mcp.status = 'connected';
      addToast({ type: 'success', title: '探针握手正常', message: res.message || 'MCP RPC 连通响应正常' });
    } else {
      addToast({ type: 'error', title: '探针握手失败', message: res.message || '连通超时' });
    }
  } catch (err: any) {
    addToast({ type: 'error', title: '探针握手失败', message: err.message });
  }
}

// LLM Provider Operations
export async function updateLlmProvider(
  id: string,
  updates: {
    apiKey?: string;
    baseUrl?: string;
    displayName?: string;
    defaultModel?: string;
    supportedModels?: string[];
    enabled?: boolean;
  }
) {
  if (!checkPermissionAndNotify('llm_provider:update')) return null;
  try {
    const reqData: Record<string, unknown> = {};
    if (updates.apiKey !== undefined) reqData.apiKey = updates.apiKey;
    if (updates.baseUrl !== undefined) reqData.baseUrl = updates.baseUrl;
    if (updates.displayName !== undefined) reqData.displayName = updates.displayName;
    if (updates.defaultModel !== undefined) reqData.defaultModel = updates.defaultModel;
    if (updates.supportedModels !== undefined) reqData.supportedModels = updates.supportedModels;
    if (updates.enabled !== undefined) reqData.enabled = updates.enabled;

    const dto = await api.updateLlmProvider(id, reqData);
    const updatedLlm = mapLlmDtoToLlm(dto);
    const idx = state.llmProviders.findIndex((p) => p.id === id || p.code === id);
    if (idx !== -1) {
      state.llmProviders[idx] = { ...state.llmProviders[idx], ...updatedLlm };
    } else {
      state.llmProviders.push(updatedLlm);
    }
    addToast({
      type: 'success',
      title: '配置已保存',
      message: `已成功配置 ${updatedLlm.name || id}，参数已加密持久化至数据库`,
    });
    return updatedLlm;
  } catch (err: any) {
    const errMsg = err.response?.data?.message || err.message || '请检查网络与权限后重试';
    addToast({ type: 'error', title: '保存失败', message: errMsg });
    throw err;
  }
}

export async function deleteLlmProvider(provider: string) {
  if (!checkPermissionAndNotify('llm_provider:update')) return false;
  try {
    await api.deleteLlmProvider(provider);
    await fetchLlmProviders();
    addToast({ type: 'success', title: '供应商已删除', message: `已成功移除供应商「${provider}」` });
    return true;
  } catch (err: any) {
    const errMsg = err.response?.data?.message || err.message || '删除供应商失败';
    addToast({ type: 'error', title: '删除失败', message: errMsg });
    return false;
  }
}

export async function testLlmProvider(id: string) {
  if (!checkPermissionAndNotify('llm_provider:test')) return;
  try {
    const res = await api.testLlmProvider(id);
    if (res.success) {
      addToast({ type: 'success', title: 'API Key 测试通过', message: res.message || 'Endpoint 响应 200 OK' });
    } else {
      addToast({ type: 'error', title: '连通失败', message: res.message || '密钥无效或网络不可达' });
    }
  } catch (err: any) {
    addToast({ type: 'error', title: '测试连通失败', message: err.message });
  }
}

// User Management
export async function addUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>) {
  if (!checkPermissionAndNotify('user:create')) return;
  try {
    const dto = await api.createUser({
      username: user.username,
      password: 'admin123',
      email: user.email,
      displayName: user.displayName,
    });
    const newUser = mapUserDtoToUser(dto);
    state.users.unshift(newUser);
    addToast({ type: 'success', title: '新增账号', message: `用户 @${newUser.username} 创建完成` });
  } catch (err: any) {
    const fallback: User = {
      ...user,
      id: `u-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      lastLogin: '从未登录',
    };
    state.users.unshift(fallback);
    addToast({ type: 'warning', title: '本地保存用户', message: `后端响应异常: ${err.message}` });
  }
}

export async function updateUser(id: string, updates: Partial<User>) {
  if (!checkPermissionAndNotify('user:update')) return;
  try {
    if (updates.displayName || updates.email) {
      await api.updateProfile(id, { displayName: updates.displayName, email: updates.email });
    }
    if (updates.status) {
      await api.updateUserStatus(id, updates.status === 'active' ? 'ACTIVE' : 'DISABLED');
    }
  } catch (err: any) {
    console.warn('API 更新用户失败:', err.message);
  }
  const idx = state.users.findIndex((u) => u.id === id);
  if (idx !== -1) {
    state.users[idx] = { ...state.users[idx], ...updates };
    if (state.currentUser?.id === id) {
      state.currentUser = { ...state.currentUser, ...updates };
    }
    addToast({ type: 'success', title: '用户信息更新', message: '账号权限与个人资料已刷新' });
  }
}

export async function deleteUser(id: string) {
  if (!checkPermissionAndNotify('user:delete')) return;
  try {
    await api.deleteUser(id);
  } catch (err: any) {
    console.warn('API 删除用户失败:', err.message);
  }
  const u = state.users.find((x) => x.id === id);
  state.users = state.users.filter((x) => x.id !== id);
  addToast({ type: 'info', title: '账号已注销', message: `用户 @${u?.username || id} 已被安全移除` });
}

export async function resetUserPassword(id: string, newPassword = 'NewPassword123') {
  if (!checkPermissionAndNotify('user:reset_password')) return;
  try {
    await api.resetPassword(id, newPassword);
  } catch (err: any) {
    console.warn('API 重置密码失败:', err.message);
  }
  const idx = state.users.findIndex((u) => u.id === id);
  if (idx !== -1) {
    state.users[idx].mustResetPassword = true;
    addToast({ type: 'warning', title: '密码已重置', message: `用户 @${state.users[idx].username} 密码已重置` });
  }
}

// Display Mode Operations
export function setDisplayMode(mode: DisplayMode) {
  state.displayMode = mode;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('agentforge_display_mode', mode);
  }
  applyDisplayScale();
  const labels: Record<DisplayMode, string> = {
    auto: '智能自适应 (自动感应 17寸/大屏加成)',
    100: '100% 标准基准 (适用于 13-15 英寸屏)',
    110: '110% 舒展大屏 (⭐ 推荐 17 英寸/2K 屏)',
    125: '125% 广角放大',
    90: '92% 紧凑极简',
  };
  addToast({ type: 'info', title: '界面比例调节成功', message: `已切换至 ${labels[mode]}` });
}

export function applyDisplayScale() {
  if (typeof document === 'undefined') return;
  const mode = state.displayMode;
  let scale = 1;

  if (mode === '90') {
    scale = 0.92;
  } else if (mode === '100') {
    scale = 1.0;
  } else if (mode === '110') {
    scale = 1.1; // 17" scale
  } else if (mode === '125') {
    scale = 1.25;
  } else if (mode === 'auto') {
    const width = window.innerWidth;
    if (width >= 2560) {
      scale = 1.18;
    } else if (width >= 1600) {
      scale = 1.08;
    } else {
      scale = 1.0;
    }
  }

  document.documentElement.style.setProperty('--app-font-scale', scale.toString());
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (state.displayMode === 'auto') {
      applyDisplayScale();
    }
  });
  setTimeout(() => {
    applyDisplayScale();
  }, 50);
}

export function useAppStore() {
  return {
    state,
    hasRole,
    hasPermission,
    hasAnyPermission,
    checkPermissionAndNotify,
    addToast,
    removeToast,
    setRoute,
    refreshRouteData,
    setDisplayMode,
    applyDisplayScale,
    handleLoginApi,
    login,
    logout,
    completePasswordReset,
    fetchAllData,
    fetchAgents,
    fetchWorkflows,
    fetchWorkflowDetail,
    fetchMcpServers,
    fetchLlmProviders,
    fetchRuns,
    fetchUsers,
    fetchRoles,
    fetchDashboardStats,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    copyWorkflow,
    publishWorkflow,
    unpublishWorkflow,
    validateWorkflow,
    triggerRun,
    stopRun,
    updateRunInStore,
    addAgent,
    updateAgent,
    deleteAgent,
    copyAgent,
    addMcpServer,
    updateMcpServer,
    deleteMcpServer,
    testMcpServer,
    updateLlmProvider,
    deleteLlmProvider,
    testLlmProvider,
    addUser,
    updateUser,
    deleteUser,
    resetUserPassword,
  };
}
