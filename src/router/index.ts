import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import P01_Login from '../components/pages/P01_Login.vue';
import P04_Dashboard from '../components/pages/P04_Dashboard.vue';
import P05_WorkflowList from '../components/pages/P05_WorkflowList.vue';
import P06_WorkflowEditor from '../components/pages/P06_WorkflowEditor.vue';
import P07_ExecutionMonitor from '../components/pages/P07_ExecutionMonitor.vue';
import P08_AgentList from '../components/pages/P08_AgentList.vue';
import P10_MCPServerList from '../components/pages/P10_MCPServerList.vue';
import P12_LLMProviderList from '../components/pages/P12_LLMProviderList.vue';
import P13_ExecutionHistory from '../components/pages/P13_ExecutionHistory.vue';
import P14_ExecutionDetail from '../components/pages/P14_ExecutionDetail.vue';
import P15_UserManagement from '../components/pages/P15_UserManagement.vue';
import P16_RoleManagement from '../components/pages/P16_RoleManagement.vue';
import P17_Profile from '../components/pages/P17_Profile.vue';

import { tokenManager } from '../api';
import { state, refreshRouteData, fetchAllData, initUserFromSession, setRouterInstance, addToast } from '../stores/useAppStore';
import { PageRoute, RoleType } from '../types';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: P01_Login,
    meta: { isPublic: true },
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: P04_Dashboard },
      { path: 'workflows', name: 'workflows', component: P05_WorkflowList },
      { path: 'workflows/editor/:id?', name: 'workflow-edit', component: P06_WorkflowEditor },
      { path: 'execution-monitor', name: 'workflow-monitor', component: P07_ExecutionMonitor },
      { path: 'agents', name: 'agents', component: P08_AgentList },
      { path: 'mcp-servers', name: 'mcp-servers', component: P10_MCPServerList },
      { path: 'llm-providers', name: 'llm-providers', component: P12_LLMProviderList },
      { path: 'execution-history', name: 'runs', component: P13_ExecutionHistory },
      { path: 'execution-detail/:id?', name: 'run-detail', component: P14_ExecutionDetail },
      { path: 'users', name: 'users', component: P15_UserManagement, meta: { roles: ['ADMIN'] as RoleType[] } },
      { path: 'roles', name: 'roles', component: P16_RoleManagement, meta: { roles: ['ADMIN'] as RoleType[] } },
      { path: 'profile', name: 'profile', component: P17_Profile },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

setRouterInstance(router);

// 路由与 PageRoute 映射表
export const routeNameToPageRoute: Record<string, PageRoute> = {
  dashboard: 'dashboard',
  workflows: 'workflows',
  'workflow-edit': 'workflow-edit',
  'workflow-monitor': 'workflow-monitor',
  agents: 'agents',
  'mcp-servers': 'mcp-servers',
  'llm-providers': 'llm-providers',
  runs: 'runs',
  'run-detail': 'run-detail',
  users: 'users',
  roles: 'roles',
  profile: 'profile',
  login: 'login',
};

export const pageRouteToPath: Record<PageRoute, string> = {
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

// 全局路由前置守卫
let initialAuthChecked = false;

router.beforeEach(async (to, _from, next) => {
  const isPublic = to.meta.isPublic === true || to.path === '/login';

  // 1. 如果尚未初始化校验内存 Token（例如页面被刷新 F5），尝试用静默刷新恢复 Access Token
  if (!initialAuthChecked && !tokenManager.getAccessToken()) {
    try {
      const refreshedToken = await tokenManager.refresh();
      if (refreshedToken) {
        state.isLoggedIn = true;
        await initUserFromSession();
        fetchAllData();
      }
    } catch {
      state.isLoggedIn = false;
      tokenManager.clear();
    } finally {
      initialAuthChecked = true;
    }
  } else {
    initialAuthChecked = true;
  }

  const hasToken = !!tokenManager.getAccessToken();

  // 2. 鉴权与 RBAC 权限判断
  if (!isPublic && !hasToken) {
    // 受保护路由但未认证 -> 跳转登录页
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if (isPublic && hasToken) {
    // 已认证访问登录页 -> 跳转工作台
    next({ path: '/dashboard' });
  } else {
    // 检查 RBAC 路由权限
    const requiredRoles = to.meta.roles as RoleType[] | undefined;
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = state.currentUser?.role || 'VIEWER';
      if (!requiredRoles.includes(userRole)) {
        addToast({
          type: 'warning',
          title: '访问受限',
          message: `您当前的角色 [${userRole}] 无权访问该管理模块，需要 [${requiredRoles.join(', ')}] 权限`,
        });
        next({ path: '/dashboard' });
        return;
      }
    }
    next();
  }
});

// 全局路由后置钩子：同步 PageRoute 状态 & 触发数据加载
router.afterEach((to) => {
  const pageRoute = routeNameToPageRoute[to.name as string] || 'dashboard';
  state.route = pageRoute;

  // 记录路由参数中可能包含的选中ID
  if (to.params.id) {
    if (pageRoute === 'workflow-edit') {
      state.selectedWorkflowId = to.params.id as string;
    } else if (pageRoute === 'run-detail') {
      state.selectedRunId = to.params.id as string;
    }
  }

  if (state.isLoggedIn && pageRoute !== 'login') {
    refreshRouteData(pageRoute);
  }
});
