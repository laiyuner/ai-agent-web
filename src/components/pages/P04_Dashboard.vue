<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Top Welcome Banner (Graphite & High Contrast) -->
    <div class="bg-slate-900 rounded-3xl p-5 sm:p-6 lg:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
      <div class="relative z-10 space-y-2.5">
        <div class="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-0.5 rounded-full text-xs font-semibold">
          <Activity class="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>AgentForge 自托管引擎总控台</span>
        </div>
        <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight">
          欢迎回来，{{ state.currentUser?.displayName }}
        </h2>
        <p class="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          平台当前运行 <strong class="text-white font-mono">{{ state.workflows.length }}</strong> 个已发布工作流，挂载 <strong class="text-white font-mono">{{ state.mcpServers.length }}</strong> 个 MCP 工具服务器，驱动 <strong class="text-white font-mono">{{ state.agents.length }}</strong> 个特化 Agent 智能体。
        </p>
      </div>

      <div class="mt-5 flex flex-wrap gap-3 z-10 relative">
        <button
          @click="openNewWorkflowCanvas"
          class="bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer btn-tactile"
        >
          <Plus class="w-4 h-4" />
          <span>新建可视化 DAG 工作流</span>
        </button>
        <button
          @click="setRoute('agents')"
          class="bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer btn-tactile"
        >
          <Bot class="w-4 h-4 text-indigo-400" />
          <span>管理 Agent 智能体池</span>
        </button>
      </div>
    </div>

    <!-- Stat Metrics Grid (4 columns on desktop, responsive) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div
        v-for="card in statCards"
        :key="card.title"
        class="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs card-elevated flex items-start justify-between cursor-pointer group"
        @click="setRoute(card.route)"
      >
        <div class="space-y-1.5">
          <span class="text-xs sm:text-sm font-bold text-slate-500">{{ card.title }}</span>
          <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ card.value }}</div>
          <div class="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
            <component :is="card.subIcon" class="w-4 h-4" :class="card.subColor" />
            <span>{{ card.subText }}</span>
          </div>
        </div>
        <div class="p-3.5 rounded-2xl transition-transform group-hover:scale-105" :class="card.iconBg">
          <component :is="card.icon" class="w-6 h-6" :class="card.iconColor" />
        </div>
      </div>
    </div>

    <!-- Main Content Area: Full Responsive Grid Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Main Column: Workflows (lg:col-span-8) -->
      <div class="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <GitFork class="w-5 h-5 text-indigo-600" />
            <h3 class="font-bold text-slate-900 text-base sm:text-lg">核心工作流调度与快速运行</h3>
          </div>
          <button
            @click="setRoute('workflows')"
            class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-200/80 hover:border-indigo-300 transition-all flex items-center gap-1.5 group cursor-pointer shadow-2xs btn-tactile"
          >
            <span>查看全部 ({{ state.workflows.length }})</span>
            <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <div
            v-if="state.workflows.length === 0"
            class="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2"
          >
            <GitFork class="w-8 h-8 text-slate-300 mx-auto" />
            <p class="text-xs font-bold text-slate-700">暂无工作流数据</p>
            <p class="text-[11px] text-slate-400">数据库中暂无工作流编排，可点击右上方按钮新建 DAG 工作流</p>
          </div>
          <div
            v-else
            v-for="wf in state.workflows"
            :key="wf.id"
            class="p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs card-elevated"
          >
            <div class="space-y-2 flex-1 min-w-0">
              <div class="flex items-center gap-2.5">
                <span
                  @click="openEdit(wf.id)"
                  class="font-bold text-slate-900 text-sm sm:text-base hover:text-indigo-600 cursor-pointer transition-colors truncate block"
                  :title="wf.name"
                >
                  {{ wf.name }}
                </span>
                <span
                  class="text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0"
                  :class="wf.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'"
                >
                  {{ wf.status === 'published' ? '已上线' : '草稿' }}
                </span>
              </div>
              <p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">{{ wf.description }}</p>
              <div class="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 font-mono">
                <span class="whitespace-nowrap">节点数: <strong class="text-slate-700">{{ wf.nodeCount ?? wf.nodes?.length ?? 0 }}</strong></span>
                <span class="whitespace-nowrap">创建人: <strong class="text-slate-700">{{ wf.author || '系统' }}</strong></span>
                <span class="whitespace-nowrap">更新时间: {{ wf.updatedAt ? wf.updatedAt.slice(0, 16) : '-' }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              <button
                @click="openEdit(wf.id)"
                class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs sm:text-sm text-slate-800 font-semibold transition-colors cursor-pointer btn-tactile whitespace-nowrap"
              >
                画布编辑
              </button>
              <button
                @click="openRunDialog(wf)"
                class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer btn-tactile whitespace-nowrap"
              >
                <Play class="w-4 h-4 fill-current" />
                <span>立即调度</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Executions & MCP Servers (lg:col-span-4) -->
      <div class="lg:col-span-4 space-y-6">
        <!-- Recent Run Logs -->
        <div class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Activity class="w-5 h-5 text-emerald-600" />
              <h3 class="font-bold text-slate-900 text-base">最近运行推流</h3>
            </div>
            <button
              @click="setRoute('runs')"
              class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-200/80 hover:border-indigo-300 transition-all flex items-center gap-1.5 group cursor-pointer shadow-2xs btn-tactile"
            >
              <span>全量历史</span>
              <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-if="state.runs.length === 0"
              class="py-8 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-1"
            >
              <Activity class="w-6 h-6 text-slate-300 mx-auto" />
              <p class="text-xs font-bold text-slate-700">暂无推流运行日志</p>
            </div>
            <div
              v-else
              v-for="run in state.runs.slice(0, 4)"
              :key="run.id"
              @click="viewRun(run.id)"
              class="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all space-y-2"
            >
              <div class="flex items-center justify-between text-xs sm:text-sm">
                <span class="font-bold text-slate-900 truncate max-w-[200px]">{{ run.workflowName }}</span>
                <span
                  class="text-xs px-2.5 py-0.5 rounded-full font-bold"
                  :class="
                    (run.status || '').toLowerCase() === 'running'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                      : (run.status || '').toLowerCase() === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  "
                >
                  {{ (run.status || '').toLowerCase() === 'running' ? '推流中' : (run.status || '').toLowerCase() === 'success' ? '完成' : '异常终止' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Run #{{ run.id }}</span>
                <span>{{ run.startTime.slice(11) }}</span>
                <span>Tokens: {{ run.tokensUsed }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- MCP Server Health -->
        <div class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Server class="w-5 h-5 text-indigo-600" />
              <h3 class="font-bold text-slate-900 text-base">MCP 服务器健康度</h3>
            </div>
            <button
              @click="setRoute('mcp-servers')"
              class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-200/80 hover:border-indigo-300 transition-all flex items-center gap-1.5 group cursor-pointer shadow-2xs"
            >
              <span>管理</span>
              <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div class="space-y-2.5">
            <div
              v-if="state.mcpServers.length === 0"
              class="py-8 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-1"
            >
              <Server class="w-6 h-6 text-slate-300 mx-auto" />
              <p class="text-xs font-bold text-slate-700">暂无 MCP 服务器接入</p>
              <p class="text-[11px] text-slate-400">数据库中未注册外部 Model Context Protocol 探针</p>
            </div>
            <div
              v-else
              v-for="mcp in state.mcpServers"
              :key="mcp.id"
              class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 text-xs sm:text-sm"
            >
              <div class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full" :class="mcp.status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                <span class="font-bold text-slate-800">{{ mcp.name }}</span>
              </div>
              <span class="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                {{ mcp.toolsCount }} 工具
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Input Modal -->
    <RunInputDialog
      :is-open="runDialogOpen"
      :workflow="selectedWfForRun"
      @close="runDialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Activity,
  Plus,
  Bot,
  GitFork,
  Server,
  ArrowRight,
  Play,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import RunInputDialog from '../common/RunInputDialog.vue';
import { PageRoute, Workflow } from '../../types';

const { state, setRoute } = useAppStore();

const runDialogOpen = ref(false);
const selectedWfForRun = ref<Workflow | null>(null);

function openRunDialog(wf: Workflow) {
  selectedWfForRun.value = wf;
  runDialogOpen.value = true;
}

const statCards = computed(() => [
  {
    title: '工作流模板 (Workflows)',
    value: state.workflows.length.toString(),
    subText: `${state.workflows.filter((w) => w.status === 'published').length} 已发布上线`,
    subIcon: CheckCircle2,
    subColor: 'text-emerald-500',
    icon: GitFork,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    route: 'workflows' as PageRoute,
  },
  {
    title: '实时推流任务 (Running)',
    value: state.runs.filter((r) => (r.status || '').toLowerCase() === 'running').length.toString(),
    subText: 'WebSocket 挂载实时追踪',
    subIcon: Activity,
    subColor: 'text-amber-500',
    icon: Activity,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    route: 'workflow-monitor' as PageRoute,
  },
  {
    title: '智能体 (Agents)',
    value: state.agents.length.toString(),
    subText: '支持 ReAct 与 Function Call',
    subIcon: TrendingUp,
    subColor: 'text-indigo-500',
    icon: Bot,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    route: 'agents' as PageRoute,
  },
  {
    title: 'MCP 工具扩展服务器',
    value: state.mcpServers.length.toString(),
    subText: '探针长连接握手正常',
    subIcon: Clock,
    subColor: 'text-slate-400',
    icon: Server,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    route: 'mcp-servers' as PageRoute,
  },
]);

function openNewWorkflowCanvas() {
  state.selectedWorkflowId = '';
  setRoute('workflow-edit');
}

function openEdit(id: string) {
  state.selectedWorkflowId = id;
  setRoute('workflow-edit');
}

function viewRun(runId: string) {
  state.selectedRunId = runId;
  setRoute('workflow-monitor');
}
</script>
