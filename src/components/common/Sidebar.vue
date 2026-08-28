<template>
  <aside class="w-60 border-r border-slate-200 bg-slate-50/70 flex flex-col justify-between shrink-0 select-none">
    <div class="p-3.5 space-y-6 overflow-y-auto">
      <div v-for="group in visibleMenuGroups" :key="group.title" class="space-y-1.5">
        <div class="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          {{ group.title }}
        </div>
        <div class="space-y-1">
          <button
            v-for="item in group.items"
            :key="item.route"
            @click="handleMenuClick(item.route)"
            class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all group cursor-pointer"
            :class="
              state.route === item.route
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
            "
          >
            <div class="flex items-center gap-3">
              <component
                :is="item.icon"
                class="w-4 h-4 shrink-0"
                :class="state.route === item.route ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-700'"
              />
              <span>{{ item.label }}</span>
            </div>
            <span
              v-if="item.badge"
              class="text-xs px-2 py-0.5 rounded-full font-bold font-mono"
              :class="state.route === item.route ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/90 text-slate-700'"
            >
              {{ item.badge }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Footer Info -->
    <div class="p-3.5 border-t border-slate-200 bg-white/60">
      <div class="p-3 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs text-slate-600 space-y-1">
        <div class="flex items-center justify-between font-bold text-slate-800">
          <span>私有工作流调度</span>
          <span class="text-emerald-600 text-xs font-mono">v2.4.0</span>
        </div>
        <p class="text-[11px] text-slate-500 leading-tight">
          DAG 调度架构 · MCP 通信协议
        </p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  LayoutDashboard,
  GitFork,
  Workflow,
  Activity,
  Bot,
  Server,
  Cpu,
  History,
  Users,
  ShieldCheck,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { PageRoute } from '../../types';

const { state, setRoute, hasPermission, hasAnyPermission } = useAppStore();

function handleMenuClick(route: PageRoute) {
  if (route === 'workflow-edit') {
    state.selectedWorkflowId = '';
  }
  setRoute(route);
}

const allMenuGroups = computed(() => [
  {
    title: '概览看板',
    items: [
      { route: 'dashboard' as PageRoute, label: '系统监控大屏', icon: LayoutDashboard },
    ],
  },
  {
    title: '工作流编排',
    items: [
      { route: 'workflows' as PageRoute, label: '工作流列表', icon: GitFork, badge: state.workflows.length.toString() },
      { route: 'workflow-edit' as PageRoute, label: 'DAG 可视化画布', icon: Workflow },
    ],
  },
  {
    title: '运行与监控',
    items: [
      {
        route: 'workflow-monitor' as PageRoute,
        label: '实时推流监控',
        icon: Activity,
        badge: state.runs.filter((r) => (r.status || '').toLowerCase() === 'running').length ? '推流中' : undefined,
      },
      { route: 'runs' as PageRoute, label: '运行历史审计', icon: History, badge: state.runs.length.toString() },
    ],
  },
  {
    title: '资产与能力池',
    items: [
      { route: 'agents' as PageRoute, label: 'Agent 智能体', icon: Bot, badge: state.agents.length.toString() },
      { route: 'mcp-servers' as PageRoute, label: 'MCP 服务器', icon: Server, badge: state.mcpServers.length.toString() },
      { route: 'llm-providers' as PageRoute, label: 'LLM 供应商', icon: Cpu, badge: state.llmProviders.length.toString() },
    ],
  },
  {
    title: '平台管理 (RBAC)',
    requiresPermission: ['user:read', 'role:read'],
    items: [
      { route: 'users' as PageRoute, label: '用户账号管理', icon: Users, badge: state.users.length.toString() },
      { route: 'roles' as PageRoute, label: '角色权限矩阵', icon: ShieldCheck },
    ],
  },
]);

const visibleMenuGroups = computed(() => {
  return allMenuGroups.value.filter((group: any) => {
    if (group.requiresPermission) {
      return hasAnyPermission(group.requiresPermission) || state.currentUser?.role === 'ADMIN';
    }
    return true;
  });
});
</script>
