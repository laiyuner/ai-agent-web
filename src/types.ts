export type RoleType = 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: RoleType;
  status: 'active' | 'disabled' | 'pending';
  createdAt: string;
  lastLogin: string;
  mustResetPassword?: boolean;
  avatar?: string;
}

export interface PermissionMatrixItem {
  module: string;
  moduleKey: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  special?: string;
}

export interface Role {
  id: string;
  code: RoleType;
  name: string;
  description: string;
  userCount: number;
  permissions: PermissionMatrixItem[];
}

export type AgentType = 'ReAct' | 'Functions';

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  isPublic: boolean;
  llmProviderId: string;
  llmProviderName: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  boundTools: string[]; // MCP Tool IDs or names
  timeout: number;
  maxRetries: number;
  retryBackoffMs: number;
  updatedAt: string;
  creator: string;
  avatarIcon?: string;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  serverName?: string;
}

export type MCPTransportType = 'stdio' | 'SSE';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  transportType: MCPTransportType;
  status: 'connected' | 'disconnected' | 'error';
  command?: string;
  args?: string[];
  envVars?: { key: string; value: string }[];
  sseUrl?: string;
  sseHeaders?: { key: string; value: string }[];
  toolWhitelist: string[];
  toolsCount: number;
  tools: MCPTool[];
  updatedAt: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  code: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
  defaultModel: string;
  supportedModels: string[];
  status: 'configured' | 'unconfigured' | 'error';
  isBuiltIn: boolean;
}

export type WorkflowStatus = 'draft' | 'published';

export interface DAGNodeData {
  label: string;
  agentId?: string;
  agentName?: string;
  agentType?: AgentType;
  llmModel?: string;
  systemPromptOverride?: string;
  inputMappings?: { variable: string; sourceNodeId: string; sourceOutputKey: string }[];
  timeoutSeconds?: number;
  retries?: number;
  config?: any;
  nodeType?: string;
}

export interface DAGNode {
  id: string;
  type: 'agentNode' | 'startNode' | 'endNode' | 'toolNode' | 'conditionNode';
  position: { x: number; y: number };
  data: DAGNodeData;
  status?: 'idle' | 'running' | 'success' | 'failed';
}

export interface DAGEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  isPublic: boolean;
  nodes: DAGNode[];
  edges: DAGEdge[];
  nodeCount?: number;
  edgeCount?: number;
  updatedAt: string;
  author: string;
  authorAvatar?: string;
}

export type RunStatus = 'running' | 'success' | 'failed' | 'terminated';

export interface RunStepLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  nodeId?: string;
  nodeName?: string;
  message: string;
}

export interface RunNodeState {
  nodeId: string;
  nodeName: string;
  status: RunStatus;
  durationMs: number;
  tokens: number;
  inputJson: string;
  outputJson: string;
  error?: string;
}

export interface RunRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  startTime: string;
  durationMs: number;
  tokensUsed: number;
  triggerType: 'manual' | 'api' | 'scheduled';
  currentNode?: string;
  totalNodes: number;
  completedNodes: number;
  nodeStates: RunNodeState[];
  logs: RunStepLog[];
}

export type PageRoute =
  | 'login'
  | 'dashboard'
  | 'workflows'
  | 'workflow-edit'
  | 'workflow-monitor'
  | 'agents'
  | 'mcp-servers'
  | 'llm-providers'
  | 'runs'
  | 'run-detail'
  | 'users'
  | 'roles'
  | 'profile';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}
