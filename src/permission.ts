/**
 * AgentForge 全局统一权限控制模块 (RBAC & Permission System)
 * 
 * 包含：
 * 1. 细粒度权限码常量定义 (Permission Codes)
 * 2. 角色与默认权限映射表 (Role to Permissions Mapping)
 * 3. 权限判定核心函数 (hasPermission, hasAnyPermission, hasAllPermissions, hasRole)
 * 4. 统一权限拦截器与 Toast 提示 (checkPermissionAndNotify)
 * 5. Vue 3 自定义指令 (v-permission, v-role)
 * 6. 路由元信息权限校验器 (validateRoutePermission)
 */

import { App, DirectiveBinding } from 'vue';
import { RoleType } from './types';
import { state, addToast } from './stores/useAppStore';

// ==========================================
// 1. 系统权限码常量 (Permission Constants)
// ==========================================
export const PERMISSIONS = {
  // 工作流相关
  WORKFLOW: {
    READ: 'workflow:read',
    CREATE: 'workflow:create',
    UPDATE: 'workflow:update',
    DELETE: 'workflow:delete',
    CLONE: 'workflow:clone',
    EXECUTE: 'workflow:execute',
  },
  // 特化 Agent 相关
  AGENT: {
    READ: 'agent:read',
    CREATE: 'agent:create',
    UPDATE: 'agent:update',
    DELETE: 'agent:delete',
    CLONE: 'agent:clone',
  },
  // MCP 协议服务相关
  MCP_SERVER: {
    READ: 'mcp_server:read',
    CREATE: 'mcp_server:create',
    UPDATE: 'mcp_server:update',
    DELETE: 'mcp_server:delete',
    TEST: 'mcp_server:test',
  },
  // LLM 模型与网关相关
  LLM_PROVIDER: {
    READ: 'llm_provider:read',
    UPDATE: 'llm_provider:update',
    TEST: 'llm_provider:test',
  },
  // 运行实例与日志监控相关
  RUN: {
    READ: 'run:read',
    TERMINATE: 'run:terminate',
  },
  // 用户账号运维相关
  USER: {
    READ: 'user:read',
    CREATE: 'user:create',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
    RESET_PASSWORD: 'user:reset_password',
  },
  // 角色权限矩阵相关
  ROLE: {
    READ: 'role:read',
  },
} as const;

export type PermissionCode =
  | (typeof PERMISSIONS.WORKFLOW)[keyof typeof PERMISSIONS.WORKFLOW]
  | (typeof PERMISSIONS.AGENT)[keyof typeof PERMISSIONS.AGENT]
  | (typeof PERMISSIONS.MCP_SERVER)[keyof typeof PERMISSIONS.MCP_SERVER]
  | (typeof PERMISSIONS.LLM_PROVIDER)[keyof typeof PERMISSIONS.LLM_PROVIDER]
  | (typeof PERMISSIONS.RUN)[keyof typeof PERMISSIONS.RUN]
  | (typeof PERMISSIONS.USER)[keyof typeof PERMISSIONS.USER]
  | (typeof PERMISSIONS.ROLE)[keyof typeof PERMISSIONS.ROLE]
  | string;

// ==========================================
// 2. 角色默认内置权限矩阵 (Fallback Role Permissions)
// ==========================================
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  ADMIN: [
    'workflow:read', 'workflow:create', 'workflow:update', 'workflow:delete', 'workflow:clone', 'workflow:execute',
    'agent:read', 'agent:create', 'agent:update', 'agent:delete', 'agent:clone',
    'mcp_server:read', 'mcp_server:create', 'mcp_server:update', 'mcp_server:delete', 'mcp_server:test',
    'llm_provider:read', 'llm_provider:update', 'llm_provider:test',
    'run:read', 'run:terminate',
    'user:read', 'user:create', 'user:update', 'user:delete', 'user:reset_password',
    'role:read',
  ],
  DEVELOPER: [
    'workflow:read', 'workflow:create', 'workflow:update', 'workflow:clone', 'workflow:execute',
    'agent:read', 'agent:create', 'agent:update', 'agent:clone',
    'mcp_server:read', 'mcp_server:create', 'mcp_server:update', 'mcp_server:test',
    'llm_provider:read',
    'run:read', 'run:terminate',
  ],
  VIEWER: [
    'workflow:read',
    'agent:read',
    'mcp_server:read',
    'llm_provider:read',
    'run:read',
  ],
};

// 权限码中文描述映射表（用于权限拒绝提示）
export const PERMISSION_LABEL_MAP: Record<string, string> = {
  'workflow:read': '查看工作流',
  'workflow:create': '新建工作流',
  'workflow:update': '编辑工作流',
  'workflow:delete': '删除工作流',
  'workflow:clone': '克隆工作流',
  'workflow:execute': '执行/调试工作流',
  'agent:read': '查看智能体',
  'agent:create': '创建智能体',
  'agent:update': '修改智能体',
  'agent:delete': '删除智能体',
  'agent:clone': '克隆智能体',
  'mcp_server:read': '查看 MCP 服务',
  'mcp_server:create': '注册 MCP 服务',
  'mcp_server:update': '编辑 MCP 服务',
  'mcp_server:delete': '删除 MCP 服务',
  'mcp_server:test': 'MCP 探针连通测试',
  'llm_provider:read': '查看 LLM 供应商',
  'llm_provider:update': '修改 LLM 供应商配置/密钥',
  'llm_provider:test': 'LLM Endpoint 测试',
  'run:read': '查看运行记录与日志',
  'run:terminate': '终止执行实例',
  'user:read': '查看用户列表',
  'user:create': '添加平台成员',
  'user:update': '编辑用户/分配角色',
  'user:delete': '注销用户账号',
  'user:reset_password': '重置用户初始密码',
  'role:read': '查看角色权限矩阵',
};

// ==========================================
// 3. 核心鉴权方法 (Core Check Functions)
// ==========================================

/**
 * 判断当前登录用户是否具备特定角色
 */
export function hasRole(role: RoleType | RoleType[]): boolean {
  const currentRole = state.currentUser?.role;
  if (!currentRole) return false;
  if (Array.isArray(role)) {
    return role.includes(currentRole);
  }
  return currentRole === role;
}

/**
 * 判断当前登录用户是否具备指定的单项权限码
 * ADMIN 超级管理员默认放行所有权限
 */
export function hasPermission(permission: PermissionCode): boolean {
  if (state.currentUser?.role === 'ADMIN') return true;
  const userPermissions = state.permissions || [];
  return userPermissions.includes(permission);
}

/**
 * 判断当前登录用户是否具备指定权限列表中的【任意一项】(OR 逻辑)
 */
export function hasAnyPermission(permissions: PermissionCode[]): boolean {
  if (state.currentUser?.role === 'ADMIN') return true;
  if (!permissions || permissions.length === 0) return true;
  const userPermissions = state.permissions || [];
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * 判断当前登录用户是否具备指定权限列表中的【全部项】(AND 逻辑)
 */
export function hasAllPermissions(permissions: PermissionCode[]): boolean {
  if (state.currentUser?.role === 'ADMIN') return true;
  if (!permissions || permissions.length === 0) return true;
  const userPermissions = state.permissions || [];
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * 操作前置拦截与 UI 告警提示
 * @param required 权限码或角色类型
 * @returns boolean 是否允许继续执行
 */
export function checkPermissionAndNotify(required: PermissionCode | RoleType): boolean {
  // 如果是角色类型
  if (required === 'ADMIN' || required === 'DEVELOPER' || required === 'VIEWER') {
    if (!hasRole(required as RoleType)) {
      addToast({
        type: 'warning',
        title: '权限不足',
        message: `此操作仅限【${required}】角色执行，当前角色为【${state.currentUser?.role || '未知'}】`,
      });
      return false;
    }
    return true;
  }

  // 否则按细粒度权限码校验
  if (!hasPermission(required)) {
    const actionLabel = PERMISSION_LABEL_MAP[required] || required;
    addToast({
      type: 'warning',
      title: '操作受限 (403 Forbidden)',
      message: `您当前账号缺少【${actionLabel} (${required})】权限，无法执行该操作。`,
    });
    return false;
  }

  return true;
}

// ==========================================
// 4. Vue 自定义指令 (Vue Directives)
// ==========================================

/**
 * v-permission 自定义指令
 * 用法:
 * <button v-permission="'workflow:create'">新建</button>
 * <button v-permission="['workflow:create', 'workflow:update']">保存</button>
 */
export const permissionDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<PermissionCode | PermissionCode[]>) {
    const { value } = binding;
    if (!value) return;

    let hasAuth = false;
    if (Array.isArray(value)) {
      hasAuth = hasAnyPermission(value);
    } else {
      hasAuth = hasPermission(value);
    }

    if (!hasAuth) {
      // 从 DOM 中直接移除该无权元素
      el.parentNode && el.parentNode.removeChild(el);
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding<PermissionCode | PermissionCode[]>) {
    const { value } = binding;
    if (!value) return;

    let hasAuth = false;
    if (Array.isArray(value)) {
      hasAuth = hasAnyPermission(value);
    } else {
      hasAuth = hasPermission(value);
    }

    if (!hasAuth) {
      el.parentNode && el.parentNode.removeChild(el);
    }
  },
};

/**
 * v-role 自定义指令
 * 用法:
 * <div v-role="'ADMIN'">仅管理员可见</div>
 * <div v-role="['ADMIN', 'DEVELOPER']">管理员或开发者可见</div>
 */
export const roleDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<RoleType | RoleType[]>) {
    const { value } = binding;
    if (!value) return;

    const hasAuth = hasRole(value);
    if (!hasAuth) {
      el.parentNode && el.parentNode.removeChild(el);
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding<RoleType | RoleType[]>) {
    const { value } = binding;
    if (!value) return;

    const hasAuth = hasRole(value);
    if (!hasAuth) {
      el.parentNode && el.parentNode.removeChild(el);
    }
  },
};

// ==========================================
// 5. 权限插件注册安装入口 (Vue Plugin)
// ==========================================
export const permissionPlugin = {
  install(app: App) {
    // 注册全局指令
    app.directive('permission', permissionDirective);
    app.directive('role', roleDirective);

    // 注入全局属性供 template 快速调用
    app.config.globalProperties.$hasPermission = hasPermission;
    app.config.globalProperties.$hasRole = hasRole;
    app.config.globalProperties.$hasAnyPermission = hasAnyPermission;
  },
};
