<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <History class="w-6 h-6 text-indigo-600" />
          <span>调度运行历史审计 (Execution History)</span>
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          审计全量工作流执行日志、Token 消费账单与报错堆栈追踪
        </p>
      </div>
    </div>

    <!-- Filter Bar (Segmented Tabs & Search) -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div class="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
        <button
          v-for="f in filterOptions"
          :key="f.value"
          @click="statusFilter = f.value"
          class="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-none btn-tactile select-none"
          :class="statusFilter === f.value ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'"
        >
          <span>{{ f.label }}</span>
          <span
            class="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
            :class="statusFilter === f.value ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-500'"
          >
            {{ getCountByStatus(f.value) }}
          </span>
        </button>
      </div>

      <div class="relative w-full sm:w-80">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索工作流名称、运行 ID..."
          class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>
    </div>

    <!-- History Table -->
    <div class="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div class="overflow-x-auto max-h-[640px]">
        <table class="w-full text-left text-xs sm:text-sm border-collapse">
          <thead class="bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider sticky top-0 z-10">
            <tr>
              <th class="py-3.5 px-5">Run ID</th>
              <th class="py-3.5 px-5">工作流名称</th>
              <th class="py-3.5 px-5">状态</th>
              <th class="py-3.5 px-5">触发类型</th>
              <th class="py-3.5 px-5">开始时间</th>
              <th class="py-3.5 px-5">耗时</th>
              <th class="py-3.5 px-5">Tokens 消耗</th>
              <th class="py-3.5 px-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="filteredRuns.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400">
                <div class="space-y-2">
                  <p class="font-bold text-slate-700 text-sm">暂无运行历史记录</p>
                  <p class="text-xs text-slate-400">目前系统中尚未产生匹配关键词的工作流调度推流日志</p>
                </div>
              </td>
            </tr>
            <tr
              v-else
              v-for="run in filteredRuns"
              :key="run.id"
              class="hover:bg-slate-50/90 even:bg-slate-50/30 transition-colors"
            >
              <td class="py-4 px-5 font-mono font-bold text-slate-900">#{{ run.id }}</td>
              <td class="py-4 px-5 font-bold text-slate-900 text-sm sm:text-base">{{ run.workflowName }}</td>
              <td class="py-4 px-5">
                <span
                  class="px-2.5 py-1 rounded-full font-bold text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                  :class="
                    (run.status || '').toUpperCase() === 'RUNNING'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                      : (run.status || '').toUpperCase() === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                      : (run.status || '').toUpperCase() === 'TERMINATED'
                      ? 'bg-slate-100 text-slate-700 border border-slate-200/80'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  "
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="
                      (run.status || '').toUpperCase() === 'RUNNING'
                        ? 'bg-amber-500 animate-pulse'
                        : (run.status || '').toUpperCase() === 'SUCCESS'
                        ? 'bg-emerald-500'
                        : (run.status || '').toUpperCase() === 'TERMINATED'
                        ? 'bg-slate-400'
                        : 'bg-rose-500'
                    "
                  ></span>
                  {{
                    (run.status || '').toUpperCase() === 'RUNNING'
                      ? '运行中'
                      : (run.status || '').toUpperCase() === 'SUCCESS'
                      ? '成功'
                      : (run.status || '').toUpperCase() === 'TERMINATED'
                      ? '已终止'
                      : '失败'
                  }}
                </span>
              </td>
              <td class="py-4 px-5 uppercase text-xs text-slate-600 font-mono font-semibold">{{ run.triggerType || 'MANUAL' }}</td>
              <td class="py-4 px-5 text-slate-600 font-mono text-xs">{{ run.startTime }}</td>
              <td class="py-4 px-5 text-slate-800 font-mono font-bold">{{ run.durationMs }} ms</td>
              <td class="py-4 px-5 text-indigo-600 font-extrabold font-mono text-sm">{{ run.tokensUsed }}</td>
              <td class="py-4 px-5 text-right">
                <button
                  @click="viewRun(run.id)"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer btn-tactile shadow-2xs"
                  :class="
                    (run.status || '').toUpperCase() === 'RUNNING'
                      ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60'
                  "
                >
                  {{ (run.status || '').toUpperCase() === 'RUNNING' ? '查看监控' : '查看详情' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { History, Search } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';

const { state, setRoute } = useAppStore();

const searchQuery = ref('');
const statusFilter = ref('all');

const filterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '运行中', value: 'running' },
  { label: '成功', value: 'success' },
  { label: '异常', value: 'failed' },
];

function getCountByStatus(status: string) {
  if (status === 'all') return state.runs.length;
  return state.runs.filter((r) => (r.status || '').toLowerCase() === status.toLowerCase()).length;
}

const filteredRuns = computed(() => {
  return state.runs.filter((r) => {
    const matchesSearch =
      r.workflowName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesStatus =
      statusFilter.value === 'all' ||
      (r.status || '').toLowerCase() === statusFilter.value.toLowerCase();
    return matchesSearch && matchesStatus;
  });
});

function viewRun(id: string) {
  state.selectedRunId = id;
  setRoute('workflow-monitor');
}
</script>
