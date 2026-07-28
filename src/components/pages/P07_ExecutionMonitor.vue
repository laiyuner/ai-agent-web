<template>
  <div v-if="!currentRun" class="p-6 lg:p-8 w-full">
    <div class="py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <Activity class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">暂无实时推流单据</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">当前数据库中未检索到运行单据，可前往工作流列表或 DAG 画布发起调度。</p>
      </div>
      <button @click="setRoute('workflows')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer">
        <GitFork class="w-3.5 h-3.5" />
        <span>前往工作流列表</span>
      </button>
    </div>
  </div>

  <div v-else class="p-6 lg:p-8 w-full space-y-6">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
      <div class="space-y-1.5">
        <div class="flex items-center gap-3">
          <button @click="setRoute('runs')" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ArrowLeft class="w-5 h-5" />
          </button>
          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity class="w-6 h-6 text-indigo-600 animate-pulse" />
            <span>实时推流监控 (Execution Monitor)</span>
          </h2>
          <span
            class="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider"
            :class="
              currentRun.status === 'running'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                : currentRun.status === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            "
          >
            {{ currentRun.status }}
          </span>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 pl-9">
          工作流模板: <strong>{{ currentRun.workflowName }}</strong> · 运行单据 ID: <span class="font-mono font-bold text-slate-800">#{{ currentRun.id }}</span>
        </p>
      </div>

      <div class="flex items-center gap-2.5 pl-9 sm:pl-0">
        <button
          v-if="currentRun.status === 'running'"
          @click="stopRun(currentRun.id)"
          class="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold border border-rose-200 transition-colors flex items-center gap-2"
        >
          <Square class="w-4 h-4 fill-current" />
          <span>中断运行</span>
        </button>

        <button
          @click="triggerRun(currentRun.workflowId)"
          class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2"
        >
          <RotateCcw class="w-4 h-4" />
          <span>重新调度</span>
        </button>
      </div>
    </div>

    <!-- Execution Stats Bar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">算子推进进度</div>
        <div class="text-2xl font-extrabold text-slate-900 font-mono">
          {{ currentRun.completedNodes }} / {{ currentRun.totalNodes }}
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
          <div
            class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: (currentRun.completedNodes / currentRun.totalNodes) * 100 + '%' }"
          ></div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">执行耗时 (Duration)</div>
        <div class="text-2xl font-extrabold text-slate-900 font-mono">{{ currentRun.durationMs }} ms</div>
        <div class="text-xs text-slate-400 font-medium">并发 DAG 算子管线</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">Token 消耗量</div>
        <div class="text-2xl font-extrabold text-indigo-600 font-mono">{{ currentRun.tokensUsed }}</div>
        <div class="text-xs text-slate-400 font-medium">Prompt + Completion 汇总</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">触发源方式</div>
        <div class="text-2xl font-extrabold text-slate-900 uppercase font-mono">{{ currentRun.triggerType }}</div>
        <div class="text-xs text-slate-400 font-mono">时间: {{ currentRun.startTime.slice(11) }}</div>
      </div>
    </div>

    <!-- 2 Column Execution Detail -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left: DAG Node States (4 cols) -->
      <div class="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 class="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <CheckCircle2 class="w-5 h-5 text-emerald-600" />
            <span>算子执行状态序列</span>
          </h3>
          <span class="text-xs text-slate-400">点击查看 I/O 契约</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="ns in currentRun.nodeStates"
            :key="ns.nodeId"
            @click="selectedNodeState = ns"
            class="p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5"
            :class="
              selectedNodeState?.nodeId === ns.nodeId
                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200/80 hover:border-slate-300 bg-slate-50/50'
            "
          >
            <div class="flex items-center justify-between text-xs sm:text-sm">
              <span class="font-bold text-slate-900">{{ ns.nodeName }}</span>
              <span
                class="text-xs px-2.5 py-0.5 rounded-full font-bold"
                :class="
                  ns.status === 'running'
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : ns.status === 'success'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ns.status === 'failed'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-500'
                "
              >
                {{ ns.status }}
              </span>
            </div>
            <div class="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>耗时: {{ ns.durationMs }}ms</span>
              <span>Tokens: {{ ns.tokens }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Real-time Terminal Stream Logs & JSON Inspector (8 cols) -->
      <div class="lg:col-span-8 space-y-6">
        <!-- Terminal Stream -->
        <div class="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 font-mono text-xs">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2.5 text-slate-200 font-bold text-sm">
              <Terminal class="w-4 h-4 text-emerald-400" />
              <span>实时推流日志 (Live Terminal Log)</span>
            </div>
            <span class="text-xs text-slate-400">WebSocket SSE connected</span>
          </div>

          <div class="h-72 overflow-y-auto space-y-2 pr-2 text-slate-300 scrollbar-thin">
            <div
              v-for="(log, idx) in currentRun.logs"
              :key="idx"
              class="flex items-start gap-2 text-xs leading-relaxed font-mono"
            >
              <span class="text-slate-500 shrink-0 font-mono text-[11px]">[{{ log.timestamp }}]</span>
              <span
                class="font-bold uppercase shrink-0 px-1.5 py-0.5 rounded text-[9px] tracking-wide"
                :class="
                  log.level === 'error'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : log.level === 'warn'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                "
              >
                {{ log.level }}
              </span>
              <span :class="log.level === 'error' ? 'text-rose-300' : 'text-slate-200'" class="text-xs">{{ log.message }}</span>
            </div>
          </div>
        </div>

        <!-- Node Input/Output JSON Inspector -->
        <div v-if="selectedNodeState" class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 class="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <FileCode class="w-5 h-5 text-indigo-600" />
              <span>算子数据交互契约: {{ selectedNodeState.nodeName }}</span>
            </h3>
            <span class="text-xs text-slate-400 font-mono">Node ID: {{ selectedNodeState.nodeId }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div class="space-y-2">
              <span class="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider">入参 Input JSON</span>
              <pre class="p-4 bg-slate-950 text-slate-200 rounded-2xl overflow-x-auto text-xs leading-relaxed">{{ selectedNodeState.inputJson }}</pre>
            </div>
            <div class="space-y-2">
              <span class="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider">出参 Output JSON</span>
              <pre class="p-4 bg-slate-950 text-emerald-300 rounded-2xl overflow-x-auto text-xs leading-relaxed">{{ selectedNodeState.outputJson }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  ArrowLeft,
  Activity,
  Square,
  RotateCcw,
  CheckCircle2,
  Terminal,
  FileCode,
  GitFork,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { RunRecord, RunNodeState } from '../../types';

const { state, setRoute, stopRun, triggerRun } = useAppStore();

const currentRun = computed<RunRecord | null>(() => {
  return state.runs.find((r) => r.id === state.selectedRunId) || state.runs[0] || null;
});

const selectedNodeState = ref<RunNodeState | null>(
  currentRun.value?.nodeStates?.[0] || null
);
</script>
