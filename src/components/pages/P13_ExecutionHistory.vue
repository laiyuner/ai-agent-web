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

    <!-- Filter Bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
      <div class="relative w-full sm:w-96">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索工作流名称、运行 ID..."
          class="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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

    <!-- History Table -->
    <div class="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
            <tr>
              <th class="py-4 px-5">Run ID</th>
              <th class="py-4 px-5">工作流名称</th>
              <th class="py-4 px-5">状态</th>
              <th class="py-4 px-5">触发类型</th>
              <th class="py-4 px-5">开始时间</th>
              <th class="py-4 px-5">耗时</th>
              <th class="py-4 px-5">Tokens 消耗</th>
              <th class="py-4 px-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="filteredRuns.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400">
                <div class="space-y-2">
                  <p class="font-bold text-slate-700 text-sm">暂无运行历史记录</p>
                  <p class="text-xs text-slate-400">目前系统中尚未产生工作流调度推流日志</p>
                </div>
              </td>
            </tr>
            <tr v-else v-for="run in filteredRuns" :key="run.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="py-4 px-5 font-mono font-bold text-slate-900">#{{ run.id }}</td>
              <td class="py-4 px-5 font-bold text-slate-900 text-sm sm:text-base">{{ run.workflowName }}</td>
              <td class="py-4 px-5">
                <span
                  class="px-3 py-1 rounded-full font-bold text-xs"
                  :class="
                    (run.status || '').toUpperCase() === 'RUNNING'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                      : (run.status || '').toUpperCase() === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : (run.status || '').toUpperCase() === 'TERMINATED'
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  "
                >
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
                  class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  :class="
                    (run.status || '').toUpperCase() === 'RUNNING'
                      ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
