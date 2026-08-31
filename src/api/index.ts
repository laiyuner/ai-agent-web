import axios, { AxiosRequestConfig } from 'axios';
import {
  User,
  Agent,
  Workflow,
  MCPServer,
  LLMProvider,
  RunRecord,
  Role,
  RoleType,
  PermissionMatrixItem,
  AgentMcpBinding,
} from '../types';
import { addToast } from '../stores/useAppStore';

// Axios Instance Config (withCredentials allows carrying refresh token cookie)
const request = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Pure In-Memory Access Token Manager
let memoryAccessToken: string | null = null;
let tokenExpiryTime: number = 0;
let refreshPromise: Promise<string> | null = null;

export const tokenManager = {
  setAccessToken(token: string, expiresIn?: number) {
    memoryAccessToken = token;
    if (expiresIn) {
      tokenExpiryTime = Date.now() + expiresIn * 1000;
    }
  },

  getAccessToken(): string | null {
    return memoryAccessToken;
  },

  isAccessTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    if (!tokenExpiryTime) return false;
    return Date.now() >= tokenExpiryTime - 30_000;
  },

  clear() {
    memoryAccessToken = null;
    tokenExpiryTime = 0;
  },

  /**
   * Automatically refresh access token using httpOnly cookie / session refresh route
   */
  async refresh(): Promise<string> {
    if (refreshPromise) {
      return refreshPromise;
    }
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  },
};

async function doRefresh(): Promise<string> {
  const resp = await axios.post('/api/v1/auth/refresh', null, {
    withCredentials: true,
  });
  const data = resp.data?.data || resp.data;
  if (data && data.accessToken) {
    tokenManager.setAccessToken(data.accessToken, data.expiresIn);
    return data.accessToken;
  }
  throw new Error('刷新 Token 失败');
}

// Queue for 401 refresh token handling
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

// Throttling for network/server connection errors (max 1 toast per 3s)
let lastNetworkErrorToastTime = 0;
function notifyNetworkErrorOnce(customMsg?: string) {
  const now = Date.now();
  if (now - lastNetworkErrorToastTime > 3000) {
    lastNetworkErrorToastTime = now;
    addToast({
      type: 'error',
      title: '后端服务未连接',
      message: customMsg || '网络请求失败，请检查 AgentForge 后端服务是否正常启动。',
    });
  }
}

// Request Interceptor: Attach JWT Token
request.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle Code 0, 400 Bad Request, & 401 Token Refresh
request.interceptors.response.use(
  (response) => {
    const apiResp = response.data;
    // Check business code: 0 = success
    if (apiResp && typeof apiResp.code === 'number') {
      if (apiResp.code !== 0) {
        const errMsg = apiResp.message || '操作失败';
        addToast({
          type: 'error',
          title: '接口响应错误',
          message: `[错误码 ${apiResp.code}] ${errMsg}`,
        });
        return Promise.reject(new Error(errMsg));
      }
    }
    return response;
  },
  async (error) => {
    // Handle Network / Connection Refused / Timeout / Server Down (502, 503, 504)
    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || (error.response.status >= 502 && error.response.status <= 504)) {
      notifyNetworkErrorOnce(
        !error.response
          ? '无法连接至后端服务器，请检查 AgentForge 服务端口 (3000) 是否已启动。'
          : `服务器响应异常 (HTTP ${error.response.status})`
      );
      return Promise.reject(new Error(error.message || '后端服务不可用'));
    }

    const status = error.response?.status;
    const bizCode = error.response?.data?.code;
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Scenario 1: Login failure (HTTP 400 with 1001/1002/1003) - return error directly for Login page
    if (status === 400 && [1001, 1002, 1003].includes(bizCode)) {
      const msg = error.response.data?.message || '用户名或密码错误';
      return Promise.reject(new Error(msg));
    }

    // Skip auto-refresh for authentication endpoints
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    // Scenario 2: Token expiration / invalidity (HTTP 401)
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(request(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const newToken = await tokenManager.refresh();

        pendingRequests.forEach((cb) => cb(newToken));
        pendingRequests = [];

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return request(originalRequest);
      } catch (err) {
        tokenManager.clear();
        pendingRequests = [];
        addToast({
          type: 'warning',
          title: '身份凭证失效',
          message: '登录状态已过期，请重新登录系统',
        });
        return Promise.reject(new Error('登录凭证已过期，请重新登录'));
      } finally {
        isRefreshing = false;
      }
    }

    const msg = error.response?.data?.message || error.message || '网络或服务端请求错误';
    return Promise.reject(new Error(msg));
  }
);

export default request;

// ==================== Data Type Converters (DTO -> Frontend) ====================

/**
 * 智能解析并格式化创建人/作者展示名称
 * 解决后端未联查 sys_user 仅返回 ownerId/userId 等纯数字 ID 导致前端展示为数字的缺陷
 */
export function resolveCreatorName(dto: any, fallback = '系统管理员'): string {
  if (!dto) return fallback;

  // 1. 优先提取显式名称字段（去除纯数字字符串）
  const candidateNames = [
    dto.creatorName,
    dto.creator_name,
    dto.authorName,
    dto.author_name,
    dto.ownerName,
    dto.owner_name,
    dto.displayName,
    dto.display_name,
    dto.userName,
    dto.username,
    typeof dto.creator === 'string' ? dto.creator : dto.creator?.displayName || dto.creator?.username || dto.creator?.name,
    typeof dto.author === 'string' ? dto.author : dto.author?.displayName || dto.author?.username || dto.author?.name,
    typeof dto.owner === 'object' ? dto.owner?.displayName || dto.owner?.username || dto.owner?.name : undefined,
    typeof dto.user === 'object' ? dto.user?.displayName || dto.user?.username || dto.user?.name : undefined,
  ];

  for (const name of candidateNames) {
    if (typeof name === 'string' && name.trim()) {
      const trimmed = name.trim();
      // 如果不是纯数字 ID，进行规范化映射或直接返回
      if (!/^\d+$/.test(trimmed)) {
        if (trimmed === 'admin') return '系统管理员';
        if (trimmed === 'dev_chen') return '陈建国 (高级编排师)';
        if (trimmed === 'dev_li') return '李明 (架构师)';
        if (trimmed === 'viewer_lin') return '林小雨 (审计分析师)';
        return trimmed;
      }
    }
  }

  // 2. 如果只有数字 ID (ownerId / userId / createdBy / creatorId 等)，根据系统预置用户表反查映射
  const rawId =
    dto.ownerId ??
    dto.owner_id ??
    dto.userId ??
    dto.user_id ??
    dto.createdBy ??
    dto.created_by ??
    dto.creatorId ??
    dto.creator_id ??
    dto.creator ??
    dto.author;

  const idStr = String(rawId ?? '').trim();

  const idMap: Record<string, string> = {
    '1': '系统管理员',
    'usr-1': '系统管理员',
    '2': '陈建国 (高级编排师)',
    'usr-2': '陈建国 (高级编排师)',
    '3': '林小雨 (审计分析师)',
    'usr-3': '林小雨 (审计分析师)',
  };

  if (idMap[idStr]) {
    return idMap[idStr];
  }

  // 若传入未知数字 ID
  if (/^\d+$/.test(idStr) && Number(idStr) > 0) {
    return `编排师 #${idStr}`;
  }

  return fallback;
}

export function mapUserDtoToUser(dto: any): User {
  const roles = Array.isArray(dto.roles) ? dto.roles : [];
  let role: RoleType = 'VIEWER';
  if (roles.includes('ADMIN')) role = 'ADMIN';
  else if (roles.includes('DEVELOPER')) role = 'DEVELOPER';

  let status: 'active' | 'disabled' | 'pending' = 'active';
  if (dto.status === 'DISABLED') status = 'disabled';
  else if (dto.status === 'PASSWORD_RESET') status = 'pending';

  return {
    id: String(dto.id || '0'),
    username: dto.username || '',
    displayName: dto.displayName || dto.username || '未知用户',
    email: dto.email || '',
    role,
    status,
    createdAt: dto.createdAt || new Date().toISOString(),
    lastLogin: dto.lastLogin || '暂未记录',
    mustResetPassword: !!dto.mustResetPassword,
    avatar: dto.avatar || undefined,
  };
}

export function mapAgentDtoToAgent(dto: any): Agent {
  const mcpServers = Array.isArray(dto.mcpServers) ? dto.mcpServers : [];
  // 权威绑定结构：保留 mcpServerId/Name 与 enabledTools 原始结构供编辑回显
  const mcpBindings: AgentMcpBinding[] = mcpServers.map((m: any) => ({
    mcpServerId: String(m.mcpServerId),
    mcpServerName: m.mcpServerName || '',
    enabledTools: Array.isArray(m.enabledTools) ? m.enabledTools : [],
  }));
  // 派生的扁平工具名列表（仅兼容旧展示点）
  const boundTools = mcpBindings.flatMap((m) => m.enabledTools);

  const providerNames: Record<string, string> = {
    zhipu: '智谱开放平台 (BigModel)',
    deepseek: 'DeepSeek API 网关',
    openai: 'OpenAI 官方 API',
  };

  return {
    id: String(dto.id),
    name: dto.name || '',
    description: dto.description || '',
    type: (dto as any).agentType === 'openai_functions' ? 'Functions' : 'ReAct',
    // 执行模式：后端 agentType 缺省时兜底 react（对应旧数据/迁移默认值）
    agentType: (dto as any).agentType || 'react',
    isPublic: !!dto.isPublic,
    llmProviderId: dto.llmProvider || '',
    llmProviderName: providerNames[dto.llmProvider] || dto.llmProvider || '通用 LLM',
    model: dto.llmModel || '',
    temperature: dto.llmParams?.temperature ?? 0.7,
    maxTokens: dto.llmParams?.max_tokens ?? 2000,
    systemPrompt: dto.systemPrompt || '',
    boundTools,
    mcpBindings,
    timeout: Math.round((dto.timeoutMs || 60000) / 1000),
    maxRetries: dto.retryCount ?? 3,
    retryBackoffMs: dto.retryBackoffMs ?? 1000,
    updatedAt: dto.updatedAt ? dto.updatedAt.replace('T', ' ').slice(0, 16) : new Date().toISOString().slice(0, 16),
    creator: resolveCreatorName(dto, '系统管理员'),
  };
}

export function mapWorkflowDtoToWorkflow(dto: any): Workflow {
  const rawNodes = Array.isArray(dto.nodes) ? dto.nodes : [];
  const rawEdges = Array.isArray(dto.edges) ? dto.edges : [];

  const nodes = rawNodes.map((n: any) => {
    let nodeType: 'agentNode' | 'startNode' | 'endNode' | 'toolNode' | 'conditionNode' = 'agentNode';
    const rawType = String(n.nodeType || '').toUpperCase();
    if (rawType === 'START' || n.type === 'startNode') nodeType = 'startNode';
    else if (rawType === 'END' || n.type === 'endNode') nodeType = 'endNode';
    else if (rawType === 'TOOL' || n.type === 'toolNode') nodeType = 'toolNode';
    else if (rawType === 'CONDITION' || n.type === 'conditionNode') nodeType = 'conditionNode';

    return {
      id: n.nodeKey || (n.id ? `node-${n.id}` : `node-${Math.random().toString(36).slice(2, 6)}`),
      type: nodeType,
      position: {
        x: typeof n.positionX === 'number' ? n.positionX : (n.position?.x ?? 100),
        y: typeof n.positionY === 'number' ? n.positionY : (n.position?.y ?? 100),
      },
      data: {
        label: n.name || n.label || n.nodeKey || '算子节点',
        agentId: n.agentId ? String(n.agentId) : undefined,
        systemPromptOverride: n.agentOverride?.systemPrompt || undefined,
        timeoutSeconds: n.agentOverride?.timeoutMs ? Math.round(n.agentOverride.timeoutMs / 1000) : undefined,
        retries: Number.isFinite(n.agentOverride?.retryCount) ? n.agentOverride.retryCount : undefined,
        nodeType: n.nodeType,
      },
    };
  });

  const edges = rawEdges.map((e: any) => {
    const source = e.sourceNodeKey || e.source || '';
    const target = e.targetNodeKey || e.target || '';
    return {
      id: e.id ? String(e.id) : `${source}-${target}`,
      source,
      target,
      condition: e.condition || undefined,
    };
  });

  return {
    id: String(dto.id),
    name: dto.name || '',
    description: dto.description || '',
    status: dto.status === 'PUBLISHED' ? 'published' : 'draft',
    isPublic: !!dto.isPublic,
    nodes,
    edges,
    nodeCount: typeof dto.nodeCount === 'number' ? dto.nodeCount : nodes.length,
    edgeCount: typeof dto.edgeCount === 'number' ? dto.edgeCount : edges.length,
    updatedAt: dto.updatedAt ? dto.updatedAt.replace('T', ' ').slice(0, 16) : new Date().toISOString().slice(0, 16),
    author: resolveCreatorName(dto, '系统管理员'),
  };
}

export function mapMcpDtoToMcp(dto: any): MCPServer {
  const envVarsObj = dto.envVars || {};
  const envVars = Object.entries(envVarsObj).map(([key, value]) => ({ key, value: String(value) }));

  return {
    id: String(dto.id),
    name: dto.name || '',
    description: dto.description || '',
    transportType: dto.transportType === 'sse' ? 'SSE' : 'stdio',
    status: dto.enabled ? 'connected' : 'disconnected',
    command: dto.command || '',
    args: dto.args || [],
    envVars,
    sseUrl: dto.url || '',
    toolWhitelist: [],
    toolsCount: 0,
    tools: [],
    updatedAt: dto.updatedAt ? dto.updatedAt.replace('T', ' ').slice(0, 16) : new Date().toISOString().slice(0, 16),
  };
}

export function mapLlmDtoToLlm(dto: any): LLMProvider {
  const pCode = dto.provider || 'zhipu';

  return {
    id: pCode,
    // 优先用后端下发的 displayName（数据库历史记录可能没有，降级用 code）
    name: dto.displayName || `${pCode.toUpperCase()} 服务`,
    code: pCode,
    baseUrl: dto.baseUrl || '',
    // 密钥来源：DATABASE=数据库已配置；NONE=未配置（后端已移除 env 兜底）
    apiKeyConfigured: !!dto.hasApiKey,
    keyless: Boolean(dto.keyless),
    keySource: dto.keySource || (dto.hasApiKey ? 'DATABASE' : 'NONE'),
    defaultModel: dto.defaultModel || 'glm-4-flash',
    supportedModels: Array.isArray(dto.supportedModels) && dto.supportedModels.length > 0
      ? dto.supportedModels
      : [dto.defaultModel || 'glm-4-flash'],
    status: (dto.hasApiKey || dto.keyless) ? 'configured' : 'unconfigured',
    isBuiltIn: ['zhipu', 'deepseek', 'openai', 'ollama'].includes(pCode),
  };
}

export function mapRunDtoToRunRecord(dto: any): RunRecord {
  const rawNodeRuns = Array.isArray(dto.nodeRuns) ? dto.nodeRuns : [];

  const nodeStates = rawNodeRuns.map((nr: any) => {
    const tu = nr.tokensUsed;
    const totalTokens = typeof tu === 'object' && tu !== null
      ? (tu.totalTokens || tu.total_tokens || 0)
      : (typeof tu === 'number' ? tu : 0);
    return {
      nodeId: nr.nodeKey || String(nr.id),
      nodeName: nr.nodeKey || '推流节点',
      status: (nr.status === 'SUCCESS' ? 'success' : nr.status === 'FAILED' ? 'failed' : nr.status === 'TERMINATED' ? 'terminated' : 'running') as any,
      durationMs: nr.finishedAt && nr.startedAt ? new Date(nr.finishedAt).getTime() - new Date(nr.startedAt).getTime() : 0,
      tokens: totalTokens,
      // 节点真实开始执行时间（后端节点开跑时才写入；PENDING/SKIPPED 节点为 null），
      // 用于监控页节点列表按执行顺序排序
      startedAt: nr.startedAt || null,
      inputJson: nr.inputContext
        ? (typeof nr.inputContext === 'object'
           ? JSON.stringify(nr.inputContext, null, 2)
           : String(nr.inputContext))
        : '{}',
      outputJson: nr.output || '{}',
      error: nr.errorMsg || undefined,
    };
  });

  let status: any = 'running';
  if (dto.status === 'SUCCESS') status = 'success';
  else if (dto.status === 'FAILED') status = 'failed';
  else if (dto.status === 'TERMINATED') status = 'terminated';

  return {
    id: String(dto.id),
    workflowId: String(dto.workflowId || '1'),
    workflowName: `工作流 #${dto.workflowId}`,
    status,
    startTime: dto.startedAt ? dto.startedAt.replace('T', ' ').slice(0, 19) : new Date().toISOString().slice(0, 19),
    durationMs: dto.durationMs || 0,
    tokensUsed: dto.totalTokens || 0,
    triggerType: 'manual',
    totalNodes: rawNodeRuns.length || 1,
    completedNodes: rawNodeRuns.filter((n: any) => n.status === 'SUCCESS').length,
    nodeStates,
    logs: [
      {
        timestamp: dto.startedAt ? dto.startedAt.slice(11, 19) : '00:00:00',
        level: dto.status === 'FAILED' ? 'error' : 'info',
        message: dto.errorMsg || `工作流执行状态: ${dto.status}`,
      },
    ],
  };
}

export function mapRoleDtoToRole(dto: any): Role {
  return {
    id: String(dto.id),
    code: dto.name as RoleType,
    name: dto.name === 'ADMIN' ? '超级管理员' : dto.name === 'DEVELOPER' ? '开发者' : '审计访客',
    description: dto.description || '',
    userCount: typeof dto.userCount === 'number' ? dto.userCount : 0, // 后端已返回
    permissions: [], // 由 fetchRoles 异步填充
  };
}

/**
 * 将后端权限列表（含 resource/action 字段）聚合为前端矩阵展示结构。
 * resource -> 模块行；action -> CRUD 列；非 CRUD 的 action 归入"特殊特权"。
 */
const RESOURCE_MODULE_NAMES: Record<string, string> = {
  user: '用户管理',
  role: '角色管理',
  permission: '权限定义',
  agent: 'Agent 智能体',
  workflow: '工作流',
  mcp_server: 'MCP 服务器',
  llm_provider: 'LLM 供应商',
  run: '执行历史',
};

export function aggregatePermissionsToMatrix(perms: any[]): PermissionMatrixItem[] {
  const byResource = new Map<string, Set<string>>();
  for (const p of perms) {
    if (!byResource.has(p.resource)) byResource.set(p.resource, new Set());
    byResource.get(p.resource)!.add(p.action);
  }
  const rows: PermissionMatrixItem[] = [];
  for (const [resource, actions] of byResource) {
    const special = [...actions].filter((a) => !['read', 'create', 'update', 'delete'].includes(a));
    rows.push({
      module: RESOURCE_MODULE_NAMES[resource] || resource,
      moduleKey: resource,
      read: actions.has('read'),
      create: actions.has('create'),
      update: actions.has('update'),
      delete: actions.has('delete'),
      special: special.length ? special.join(' / ') : undefined,
    });
  }
  return rows;
}

// ==================== API Methods ====================

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const res = await request.post('/auth/login', { username, password });
    return res.data?.data || res.data;
  },
  refreshToken: async () => {
    const res = await request.post('/auth/refresh', null);
    return res.data?.data || res.data;
  },
  logout: async () => {
    try {
      await request.post('/auth/logout', null);
    } catch {
      // Ignore error during logout
    }
  },
  changePassword: async (oldPassword: string, newPassword: string) => {
    const res = await request.put('/auth/me', { oldPassword, newPassword });
    return res.data?.data || res.data;
  },
  getMe: async () => {
    const res = await request.get('/auth/me');
    return res.data?.data || res.data;
  },

  // Agents
  getAgents: async (page = 1, size = 10, keyword = '') => {
    const res = await request.get('/agents', { params: { page, size, keyword } });
    return res.data?.data || res.data;
  },
  getAgent: async (id: string | number) => {
    const res = await request.get(`/agents/${id}`);
    return res.data?.data || res.data;
  },
  createAgent: async (data: any) => {
    const res = await request.post('/agents', data);
    return res.data?.data || res.data;
  },
  updateAgent: async (id: string | number, data: any) => {
    const res = await request.put(`/agents/${id}`, data);
    return res.data?.data || res.data;
  },
  deleteAgent: async (id: string | number) => {
    const res = await request.delete(`/agents/${id}`);
    return res.data?.data || res.data;
  },
  cloneAgent: async (id: string | number, name: string) => {
    const res = await request.post(`/agents/${id}/clone`, { name });
    return res.data?.data || res.data;
  },
  getAgentTools: async (id: string | number) => {
    const res = await request.get(`/agents/${id}/tools`);
    return res.data?.data || res.data;
  },
  updateAgentVisibility: async (id: string | number, isPublic: boolean) => {
    const res = await request.patch(`/agents/${id}/visibility`, null, { params: { isPublic } });
    return res.data?.data || res.data;
  },

  // Workflows
  getWorkflows: async (page = 1, size = 10, keyword = '') => {
    const res = await request.get('/workflows', { params: { page, size, keyword } });
    return res.data?.data || res.data;
  },
  getWorkflow: async (id: string | number) => {
    const res = await request.get(`/workflows/${id}`);
    return res.data?.data || res.data;
  },
  createWorkflow: async (data: any) => {
    const res = await request.post('/workflows', data);
    return res.data?.data || res.data;
  },
  updateWorkflow: async (id: string | number, data: any) => {
    const res = await request.put(`/workflows/${id}`, data);
    return res.data?.data || res.data;
  },
  deleteWorkflow: async (id: string | number) => {
    const res = await request.delete(`/workflows/${id}`);
    return res.data?.data || res.data;
  },
  validateWorkflow: async (data: any) => {
    const res = await request.post('/workflows/validate', data);
    return res.data?.data || res.data;
  },
  publishWorkflow: async (id: string | number) => {
    const res = await request.post(`/workflows/${id}/publish`);
    return res.data?.data || res.data;
  },
  unpublishWorkflow: async (id: string | number) => {
    const res = await request.post(`/workflows/${id}/unpublish`);
    return res.data?.data || res.data;
  },
  cloneWorkflow: async (id: string | number, name: string) => {
    const res = await request.post(`/workflows/${id}/clone`, { name });
    return res.data?.data || res.data;
  },
  updateWorkflowVisibility: async (id: string | number, isPublic: boolean) => {
    const res = await request.patch(`/workflows/${id}/visibility`, null, { params: { isPublic } });
    return res.data?.data || res.data;
  },

  // MCP Servers
  getMcpServers: async (page = 1, size = 10, keyword = '') => {
    const res = await request.get('/mcp-servers', { params: { page, size, keyword } });
    return res.data?.data || res.data;
  },
  getMcpServer: async (id: string | number) => {
    const res = await request.get(`/mcp-servers/${id}`);
    return res.data?.data || res.data;
  },
  createMcpServer: async (data: any) => {
    const res = await request.post('/mcp-servers', data);
    return res.data?.data || res.data;
  },
  updateMcpServer: async (id: string | number, data: any) => {
    const res = await request.put(`/mcp-servers/${id}`, data);
    return res.data?.data || res.data;
  },
  deleteMcpServer: async (id: string | number) => {
    const res = await request.delete(`/mcp-servers/${id}`);
    return res.data?.data || res.data;
  },
  testMcpServer: async (id: string | number) => {
    const res = await request.post(`/mcp-servers/${id}/test`);
    return res.data?.data || res.data;
  },
  getMcpTools: async (id: string | number) => {
    const res = await request.get(`/mcp-servers/${id}/tools`);
    return res.data?.data || res.data;
  },

  // LLM Providers
  getLlmProviders: async () => {
    const res = await request.get('/llm-providers');
    return res.data?.data || res.data;
  },
  updateLlmProvider: async (provider: string, data: any) => {
    const res = await request.put(`/llm-providers/${encodeURIComponent(provider)}`, data);
    return res.data?.data || res.data;
  },
  deleteLlmProvider: async (provider: string) => {
    const res = await request.delete(`/llm-providers/${encodeURIComponent(provider)}`);
    return res.data?.data || res.data;
  },
  testLlmProvider: async (provider: string) => {
    const res = await request.post(`/llm-providers/${encodeURIComponent(provider)}/test`);
    return res.data?.data || res.data;
  },

  // Runs
  triggerRun: async (workflowId: string | number, input: string) => {
    const res = await request.post(`/workflows/${workflowId}/runs`, { input });
    return res.data?.data || res.data;
  },
  getRuns: async (page = 1, size = 20, workflowId?: number, status?: string) => {
    const params: any = { page, size };
    if (workflowId) params.workflowId = workflowId;
    if (status) params.status = status;
    const res = await request.get('/runs', { params });
    return res.data?.data || res.data;
  },
  getRun: async (runId: string | number) => {
    const res = await request.get(`/runs/${runId}`);
    return res.data?.data || res.data;
  },
  getNodeRun: async (runId: string | number, nodeKey: string) => {
    const res = await request.get(`/runs/${runId}/nodes/${nodeKey}`);
    return res.data?.data || res.data;
  },
  terminateRun: async (runId: string | number) => {
    const res = await request.post(`/runs/${runId}/terminate`);
    return res.data?.data || res.data;
  },

  // Users
  getUsers: async (page = 1, size = 20, keyword = '') => {
    const res = await request.get('/users', { params: { page, size, keyword } });
    return res.data?.data || res.data;
  },
  getUser: async (id: string | number) => {
    const res = await request.get(`/users/${id}`);
    return res.data?.data || res.data;
  },
  createUser: async (data: any) => {
    const res = await request.post('/users', data);
    return res.data?.data || res.data;
  },
  updateUserStatus: async (id: string | number, status: string) => {
    const res = await request.put(`/users/${id}/status`, null, { params: { status } });
    return res.data?.data || res.data;
  },
  assignRole: async (id: string | number, roleId: number) => {
    const res = await request.post(`/users/${id}/roles`, { roleId });
    return res.data?.data || res.data;
  },
  removeRole: async (id: string | number, roleId: number) => {
    const res = await request.delete(`/users/${id}/roles/${roleId}`);
    return res.data?.data || res.data;
  },
  updateProfile: async (id: string | number, data: any) => {
    const res = await request.put(`/users/${id}`, data);
    return res.data?.data || res.data;
  },
  resetPassword: async (id: string | number, newPassword: string) => {
    const res = await request.put(`/users/${id}/password`, null, { params: { newPassword } });
    return res.data?.data || res.data;
  },
  deleteUser: async (id: string | number) => {
    const res = await request.delete(`/users/${id}`);
    return res.data?.data || res.data;
  },

  // Roles
  getRoles: async () => {
    const res = await request.get('/roles');
    return res.data?.data || res.data;
  },
  getRolePermissions: async (id: string | number) => {
    const res = await request.get(`/roles/${id}/permissions`);
    return res.data?.data || res.data;
  },

  // Dashboard
  getDashboardStats: async () => {
    const res = await request.get('/dashboard/stats');
    return res.data?.data || res.data;
  },
};
