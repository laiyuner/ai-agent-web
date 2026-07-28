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
        @click="createNewWorkflow"
        class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
      >
        <Plus class="w-4 h-4" />
        <span>新建 DAG 工作流</span>
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <div class="relative w-full sm:w-80">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索工作流名称、描述或作者..."
            class="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          v-for="f in filterOptions"
          :key="f.value"
          @click="statusFilter = f.value"
          class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          :class="statusFilter === f.value ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Workflows Grid (Fluid 3-column layout) -->
    <div v-if="filteredWorkflows.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="wf in filteredWorkflows"
        :key="wf.id"
        class="bg-white rounded-3xl border border-slate-200 hover:border-slate-400 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-5 group"
      >
        <div class="space-y-3.5">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1.5">
              <h3
                @click="openEditor(wf.id)"
                class="font-bold text-slate-900 text-base sm:text-lg hover:text-indigo-600 cursor-pointer transition-colors line-clamp-1"
              >
                {{ wf.name }}
              </h3>
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span
                  class="px-2.5 py-0.5 rounded-full font-bold"
                  :class="wf.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'"
                >
                  {{ wf.status === 'published' ? '已上线' : '草稿' }}
                </span>
                <span v-if="wf.isPublic" class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                  全员公开
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button @click="copyWorkflow(wf.id)" title="克隆副本" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <Copy class="w-4 h-4" />
              </button>
              <button @click="deleteWorkflow(wf.id)" title="删除" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed min-h-[40px]">
            {{ wf.description }}
          </p>

          <!-- DAG Nodes Summary -->
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">DAG 拓扑节点</div>
            <div class="flex items-center gap-2 text-xs font-mono font-semibold text-slate-700">
              <span class="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {{ wf.nodes.length }} 算子节点
              </span>
              <span class="text-slate-400">&rarr;</span>
              <span class="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {{ wf.edges.length }} 有向边
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
              class="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              画布编辑
            </button>
            <button
              @click="triggerRun(wf.id)"
              class="px-3.5 py-1.5 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5"
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
      <button @click="createNewWorkflow" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer">
        <Plus class="w-3.5 h-3.5" />
        <span>新建工作流</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { GitFork, Plus, Search, Copy, Trash2, Play } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';

const { state, setRoute, addWorkflow, copyWorkflow, deleteWorkflow, triggerRun } = useAppStore();

const searchQuery = ref('');
const statusFilter = ref('all');

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '已上线', value: 'published' },
  { label: '草稿', value: 'draft' },
];

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

function createNewWorkflow() {
  const created = addWorkflow({
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
  state.selectedWorkflowId = created.id;
  setRoute('workflow-edit');
}

function openEditor(id: string) {
  state.selectedWorkflowId = id;
  setRoute('workflow-edit');
}
</script>
