<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <GitFork class="w-6 h-6 text-indigo-600" />
          <span>工作流编排库 (Workflow Templates)</span>
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          基于 DAG 拓扑有向无环图，调度 Agent 智能体、MCP 工具与规则过滤节点
        </p>
      </div>

      <button
        v-if="hasPermission('workflow:create')"
        @click="createNewWorkflow"
        class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>新建 DAG 工作流</span>
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <div class="relative w-full sm:w-80">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索工作流名称、描述或作者..."
            class="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      <!-- Segmented Tab Controls -->
      <div class="flex items-center bg-slate-100/90 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start gap-1">
        <button
          v-for="f in filterOptions"
          :key="f.value"
          @click="statusFilter = f.value"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap btn-tactile"
          :class="statusFilter === f.value ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'"
        >
          <span>{{ f.label }}</span>
          <span
            class="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
            :class="statusFilter === f.value ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-500'"
          >
            {{ getFilterCount(f.value) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Workflows Grid (Fluid 3-column layout) -->
    <div v-if="filteredWorkflows.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="wf in filteredWorkflows"
        :key="wf.id"
        class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs hover:border-indigo-200 card-elevated flex flex-col justify-between gap-5 group"
      >
        <div class="space-y-3.5 flex-1 flex flex-col">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1.5 flex-1 min-w-0">
              <h3
                @click="openEditor(wf.id)"
                class="font-bold text-slate-900 text-base sm:text-lg hover:text-indigo-600 cursor-pointer transition-colors line-clamp-1 group-hover:text-indigo-600"
                :title="wf.name"
              >
                {{ wf.name }}
              </h3>
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px]"
                  :class="wf.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-slate-100 text-slate-600 border border-slate-200/80'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="wf.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"
                  ></span>
                  {{ wf.status === 'published' ? '已上线' : '草稿' }}
                </span>
                <span v-if="wf.isPublic" class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200/80 text-[11px]">
                  全员公开
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="hasPermission('workflow:clone')"
                @click="copyWorkflow(wf.id)"
                title="克隆副本"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer btn-tactile"
              >
                <Copy class="w-4 h-4" />
              </button>
              <button
                v-if="hasPermission('workflow:delete')"
                @click="deleteWorkflow(wf.id)"
                title="删除"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer btn-tactile"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed min-h-[40px] flex-1">
            {{ wf.description }}
          </p>

          <!-- DAG Nodes Summary -->
          <div class="p-3 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2 mt-auto">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DAG 拓扑节点</div>
            <div class="flex items-center gap-2 text-xs font-mono font-semibold text-slate-700 tabular-nums">
              <span class="bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                {{ wf.nodeCount ?? wf.nodes?.length ?? 0 }} 算子节点
              </span>
              <span class="text-slate-400">&rarr;</span>
              <span class="bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                {{ wf.edgeCount ?? wf.edges?.length ?? 0 }} 有向边
              </span>
            </div>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div class="text-xs text-slate-400 font-mono">
            <span>{{ wf.author }} · {{ wf.updatedAt.slice(0, 10) }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="openEditor(wf.id)"
              class="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer btn-tactile"
            >
              {{ hasPermission('workflow:update') ? '画布编辑' : '查看拓扑' }}
            </button>

            <!-- 上线按钮（草稿状态显示） -->
            <button
              v-if="wf.status !== 'published' && hasPermission('workflow:update')"
              @click="handlePublish(wf.id)"
              class="px-3.5 py-1.5 text-xs sm:text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer btn-tactile"
              title="发布上线，允许生产调度"
            >
              <Upload class="w-3.5 h-3.5" />
              <span>上线</span>
            </button>

            <!-- 下线按钮（已上线状态显示） -->
            <button
              v-else-if="wf.status === 'published' && hasPermission('workflow:update')"
              @click="handleUnpublish(wf.id)"
              class="px-3.5 py-1.5 text-xs sm:text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer btn-tactile"
              title="下线回草稿，可重新编辑"
            >
              <Download class="w-3.5 h-3.5" />
              <span>下线</span>
            </button>

            <button
              v-if="hasPermission('workflow:execute')"
              @click="openRunDialog(wf)"
              class="px-3.5 py-1.5 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer btn-tactile"
            >
              <Play class="w-3.5 h-3.5 fill-current" />
              <span>调度</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <GitFork class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">暂无工作流数据</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">未找到匹配的工作流编排模板。您可以点击右上角新建 DAG 工作流。</p>
      </div>
      <button
        v-if="hasPermission('workflow:create')"
        @click="createNewWorkflow"
        class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>新建工作流</span>
      </button>
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
import { ref, computed, watch } from 'vue';
import { GitFork, Plus, Search, Copy, Trash2, Play, Upload, Download } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import RunInputDialog from '../common/RunInputDialog.vue';
import { Workflow } from '../../types';

const { state, setRoute, addWorkflow, copyWorkflow, deleteWorkflow, fetchWorkflows, publishWorkflow, unpublishWorkflow, hasPermission } = useAppStore();

const searchQuery = ref('');
const statusFilter = ref('all');
const runDialogOpen = ref(false);
const selectedWfForRun = ref<Workflow | null>(null);

function openRunDialog(wf: Workflow) {
  selectedWfForRun.value = wf;
  runDialogOpen.value = true;
}

async function handlePublish(id: string) {
  await publishWorkflow(id);
}

async function handleUnpublish(id: string) {
  await unpublishWorkflow(id);
}

let searchTimer: any = null;
watch(searchQuery, (newVal) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fetchWorkflows(newVal);
  }, 300);
});

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '已上线', value: 'published' },
  { label: '草稿', value: 'draft' },
];

function getFilterCount(filterVal: string) {
  if (filterVal === 'all') return state.workflows.length;
  return state.workflows.filter((w) => w.status === filterVal).length;
}

const filteredWorkflows = computed(() => {
  return state.workflows.filter((wf) => {
    const matchesSearch =
      wf.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      wf.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      wf.author.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesStatus = statusFilter.value === 'all' || wf.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

async function createNewWorkflow() {
  const created = await addWorkflow({
    name: '新建 API 自动化协作流',
    description: '通过拖拽 Agent 算子与 MCP 工具生成自动化调度规则',
    status: 'draft',
    isPublic: true,
    nodes: [
      { id: 'node-start', type: 'startNode', position: { x: 100, y: 180 }, data: { label: 'HTTP Webhook 接收' } },
      { id: 'node-end', type: 'endNode', position: { x: 500, y: 180 }, data: { label: '输出结构化结果' } },
    ],
    edges: [{ id: 'e-1', source: 'node-start', target: 'node-end' }],
  });
  if (created && created.id) {
    state.selectedWorkflowId = created.id;
    setRoute('workflow-edit');
  }
}

function openEditor(id: string) {
  state.selectedWorkflowId = id;
  setRoute('workflow-edit');
}
</script>
