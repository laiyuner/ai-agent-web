<template>
  <div v-if="!currentRun" class="p-6 lg:p-8 w-full">
    <div class="py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <Activity class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">暂无执行单据</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">未检索到正在执行或历史运行单据，可前往工作流列表发起调度。</p>
      </div>
      <button
        @click="setRoute('workflows')"
        class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
      >
        <GitFork class="w-3.5 h-3.5" />
        <span>前往工作流列表</span>
      </button>
    </div>
  </div>

  <div v-else class="p-6 lg:p-8 w-full space-y-6">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
      <div class="space-y-1.5">
        <div class="flex items-center gap-3 flex-wrap">
          <button
            @click="setRoute('runs')"
            class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="返回执行历史"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>

          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity class="w-6 h-6 text-indigo-600 animate-pulse" />
            <span>执行监控</span>
          </h2>

          <!-- Status Indicator Pill -->
          <span
            class="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider"
            :class="statusClass(currentRun.status)"
          >
            {{ statusText(currentRun.status) }}
          </span>

          <!-- WebSocket Connection Status Pill -->
          <span
            class="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-all"
            :class="{
              'bg-emerald-50 text-emerald-700 border border-emerald-200': wsStatus === '已连接',
              'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse': wsStatus === '连接中...' || wsStatus === '重连中...',
              'bg-slate-100 text-slate-500 border border-slate-200': wsStatus === '已断开' || wsStatus === '已完成'
            }"
          >
            <Wifi v-if="wsStatus === '已连接'" class="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <WifiOff v-else class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ wsStatus }}</span>
          </span>
        </div>

        <p class="text-xs sm:text-sm text-slate-500 pl-9">
          工作流名称: <strong>{{ currentRun.workflowName || `工作流 #${currentRun.workflowId}` }}</strong> · 执行 ID: <span class="font-mono font-bold text-slate-800">#{{ currentRun.id }}</span>
        </p>
      </div>

      <div class="flex items-center gap-2.5 pl-9 sm:pl-0">
        <button
          v-if="currentRun.status === 'RUNNING' || currentRun.status === 'running'"
          @click="handleStopRun"
          class="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold border border-rose-200 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Square class="w-4 h-4 fill-current" />
          <span>中断运行</span>
        </button>

        <button
          @click="setRoute('workflows')"
          class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw class="w-4 h-4" />
          <span>返回工作流列表</span>
        </button>
      </div>
    </div>

    <!-- Execution Stats Bar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">节点执行进度</div>
        <div class="text-2xl font-extrabold text-slate-900 font-mono">
          {{ completedNodeCount }} / {{ totalNodeCount }}
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
          <div
            class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: ((completedNodeCount / (totalNodeCount || 1)) * 100) + '%' }"
          ></div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">总耗时 (Duration)</div>
        <div class="text-2xl font-extrabold text-slate-900 font-mono">{{ currentRun.durationMs || 0 }} ms</div>
        <div class="text-xs text-slate-400 font-mono">开始于: {{ formattedStartTime }}</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">Token 总用量</div>
        <div class="text-2xl font-extrabold text-indigo-600 font-mono">{{ totalTokensUsed }}</div>
        <div class="text-xs text-indigo-400">包含 LLM 输入及打字机输出</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">触发方式</div>
        <div class="text-2xl font-extrabold text-slate-900 uppercase font-mono">{{ currentRun.triggerType || 'MANUAL' }}</div>
        <div class="text-xs text-slate-400 font-mono">触发状态: {{ currentRun.status }}</div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Left Node Status List (4 cols) -->
      <div class="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <GitFork class="w-4 h-4 text-indigo-600" />
            <span>节点执行状态</span>
          </div>
          <span class="text-xs text-slate-400">点击节点查看输入/输出</span>
        </div>

        <div class="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          <div
            v-for="node in nodeList"
            :key="node.nodeKey"
            @click="selectedNodeKey = node.nodeKey"
            class="p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5 relative overflow-hidden"
            :class="
              selectedNodeKey === node.nodeKey
                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            "
          >
            <!-- Running Pulse Bar -->
            <div
              v-if="getNodeStatus(node.nodeKey) === 'RUNNING'"
              class="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 animate-pulse"
            ></div>

            <div class="flex items-center justify-between text-xs sm:text-sm">
              <span class="font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu class="w-3.5 h-3.5 text-indigo-500" />
                <span>{{ node.nodeName || node.nodeKey }}</span>
              </span>

              <span
                class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase"
                :class="statusClass(getNodeStatus(node.nodeKey))"
              >
                {{ statusText(getNodeStatus(node.nodeKey)) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
              <span>耗时: {{ nodeDurations[node.nodeKey] || node.durationMs || 0 }}ms</span>
              <span>Tokens: {{ nodeTokens[node.nodeKey] || node.tokens || 0 }}</span>
            </div>

            <!-- Typewriter stream badge -->
            <div
              v-if="nodeOutputs[node.nodeKey]"
              class="pt-1 flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold"
            >
              <Sparkles class="w-3 h-3 animate-spin" />
              <span>包含实时打字机输出分片</span>
            </div>
          </div>

          <div v-if="nodeList.length === 0" class="py-10 text-center text-xs text-slate-400">
            暂无关联算子节点
          </div>
        </div>
      </div>

      <!-- Right Panel: Node Inspector + Real-time Logs (8 cols) -->
      <div class="lg:col-span-8 space-y-6">
        
        <!-- Node Input / Output Panel -->
        <div
          v-if="selectedNodeKey"
          class="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4"
        >
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
              <FileCode class="w-4 h-4 text-indigo-600" />
              <span>节点输入/输出 ({{ selectedNodeKey }})</span>
            </div>
            <span class="text-xs font-mono text-slate-400">Status: {{ getNodeStatus(selectedNodeKey) }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div class="space-y-2">
              <span class="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider">输入</span>
              <pre class="p-4 bg-slate-950 text-slate-200 rounded-2xl overflow-x-auto text-xs leading-relaxed max-h-64 select-text">{{ currentSelectedNodeInput }}</pre>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider">输出</span>
                <span v-if="getNodeStatus(selectedNodeKey) === 'RUNNING'" class="text-[11px] text-indigo-500 font-sans font-semibold animate-pulse">
                  打字机生成中...
                </span>
              </div>
              <pre class="p-4 bg-slate-950 text-emerald-300 rounded-2xl overflow-x-auto text-xs leading-relaxed max-h-64 whitespace-pre-wrap select-text">{{ currentSelectedNodeOutput }}<span v-if="getNodeStatus(selectedNodeKey) === 'RUNNING'" class="inline-block w-2 h-3.5 bg-emerald-400 ml-0.5 animate-pulse align-middle"></span></pre>
            </div>
          </div>
        </div>

        <!-- Terminal Execution Logs Panel -->
        <div class="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 font-mono text-xs">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div class="flex items-center gap-2.5 text-slate-200 font-bold text-sm">
              <Terminal class="w-4 h-4 text-emerald-400" />
              <span>执行日志</span>
            </div>

            <div class="flex items-center gap-3 text-xs">
              <!-- Live WS connection label -->
              <span
                class="text-xs font-sans px-2.5 py-0.5 rounded-full font-semibold"
                :class="{
                  'text-emerald-400 bg-emerald-950/80 border border-emerald-800': wsStatus === '已连接',
                  'text-amber-400 bg-amber-950/80 border border-amber-800': wsStatus === '连接中...' || wsStatus === '重连中...',
                  'text-slate-400 bg-slate-900 border border-slate-800': wsStatus === '已断开' || wsStatus === '已完成'
                }"
              >
                {{ wsStatus }}
              </span>

              <button
                @click="autoScroll = !autoScroll"
                class="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                :title="autoScroll ? '已开启自动滚动到底部' : '已暂停自动滚动'"
              >
                <span :class="autoScroll ? 'text-emerald-400 font-bold' : 'text-slate-500'">
                  {{ autoScroll ? '● 自动滚动' : '○ 暂停滚动' }}
                </span>
              </button>

              <button
                @click="clearLogs"
                class="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-md cursor-pointer"
                title="清空执行日志"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Log stream list container -->
          <div
            ref="logContainer"
            class="h-80 overflow-y-auto space-y-2 pr-2 text-slate-300 scrollbar-thin scroll-smooth"
          >
            <div
              v-for="(log, idx) in logs"
              :key="idx"
              class="flex items-start gap-2.5 leading-relaxed"
            >
              <span class="text-slate-500 shrink-0">[{{ log.time }}]</span>
              <span
                class="uppercase text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
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
              <span :class="log.level === 'error' ? 'text-rose-300' : 'text-slate-200'" class="text-xs break-all">
                {{ log.message }}
              </span>
            </div>

            <div v-if="logs.length === 0" class="py-12 text-center text-slate-600 italic">
              等待推流事件下发中...
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  ArrowLeft,
  Activity,
  GitFork,
  Square,
  RotateCcw,
  Terminal,
  FileCode,
  Wifi,
  WifiOff,
  Cpu,
  Sparkles,
  Trash2,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { api, tokenManager, mapRunDtoToRunRecord } from '../../api';
import { WebSocketEvent } from '../../types';

const { state, setRoute, stopRun } = useAppStore();

// Current Run record from Backend API or Store
const currentRun = ref<any>(null);

// WebSocket Status state
const ws = ref<WebSocket | null>(null);
const wsStatus = ref<string>('连接中...'); // 连接中.../已连接/已断开/重连中.../已完成
const lastEventSeq = ref(0);
const heartbeatTimer = ref<any>(null);
const reconnectTimer = ref<any>(null);
const runFinished = ref(false);

// Reactive Node Maps
const nodeStatuses = reactive<Record<string, string>>({});  // nodeKey -> 'PENDING'|'RUNNING'|'SUCCESS'|'FAILED'
const nodeOutputs = reactive<Record<string, string>>({});   // nodeKey -> typewriter stream text
const nodeInputs = reactive<Record<string, string>>({});    // nodeKey -> input json text
const nodeTokens = reactive<Record<string, number>>({});    // nodeKey -> tokens used
const nodeDurations = reactive<Record<string, number>>({}); // nodeKey -> duration ms

// Logs list
const logs = reactive<Array<{ time: string; level: string; message: string }>>([]);
const logContainer = ref<HTMLDivElement | null>(null);
const autoScroll = ref(true);

// Selected node key
const selectedNodeKey = ref<string | null>(null);

// Computed list of nodes for UI
const nodeList = computed(() => {
  if (!currentRun.value) return [];
  if (Array.isArray(currentRun.value.nodeStates) && currentRun.value.nodeStates.length > 0) {
    return currentRun.value.nodeStates.map((ns: any) => ({
      nodeKey: ns.nodeId || ns.nodeKey || 'node-1',
      nodeName: ns.nodeName || ns.nodeKey || '节点',
      status: ns.status,
      durationMs: ns.durationMs,
      tokens: ns.tokens,
    }));
  }
  if (Array.isArray(currentRun.value.nodes)) {
    return currentRun.value.nodes.map((n: any) => ({
      nodeKey: n.nodeKey || String(n.id),
      nodeName: n.nodeName || n.nodeKey || '节点',
      status: n.status,
      durationMs: n.durationMs,
      tokens: n.tokens,
    }));
  }
  // Fallback default node if empty
  return [
    {
      nodeKey: 'node-1',
      nodeName: 'DAG 节点',
      status: currentRun.value.status || 'PENDING',
      durationMs: currentRun.value.durationMs || 0,
      tokens: currentRun.value.tokensUsed || 0,
    },
  ];
});

const totalNodeCount = computed(() => {
  return currentRun.value?.totalNodes || nodeList.value.length || 1;
});

const completedNodeCount = computed(() => {
  const completedFromStatuses = Object.values(nodeStatuses).filter((s) => s === 'SUCCESS').length;
  if (completedFromStatuses > 0) return completedFromStatuses;
  return currentRun.value?.completedNodes || 0;
});

const totalTokensUsed = computed(() => {
  const sumTokensFromNodes = Object.values(nodeTokens).reduce((a, b) => a + b, 0);
  if (sumTokensFromNodes > 0) return sumTokensFromNodes;
  return currentRun.value?.tokensUsed || 0;
});

const formattedStartTime = computed(() => {
  if (!currentRun.value?.startTime) return '--:--:--';
  return currentRun.value.startTime.includes('T')
    ? currentRun.value.startTime.split('T')[1].slice(0, 8)
    : currentRun.value.startTime.slice(-8);
});

const currentSelectedNodeInput = computed(() => {
  if (!selectedNodeKey.value) return '{}';
  if (nodeInputs[selectedNodeKey.value]) return nodeInputs[selectedNodeKey.value];
  const found = currentRun.value?.nodeStates?.find((n: any) => (n.nodeId || n.nodeKey) === selectedNodeKey.value);
  return found?.inputJson || currentRun.value?.input || '{}';
});

const currentSelectedNodeOutput = computed(() => {
  if (!selectedNodeKey.value) return '等待节点响应...';
  if (nodeOutputs[selectedNodeKey.value]) return nodeOutputs[selectedNodeKey.value];
  const found = currentRun.value?.nodeStates?.find((n: any) => (n.nodeId || n.nodeKey) === selectedNodeKey.value);
  return found?.outputJson || currentRun.value?.output || '等待输出...';
});

// Helper for status text
function statusText(status: string): string {
  if (!status) return '待执行';
  const upper = status.toUpperCase();
  const map: Record<string, string> = {
    PENDING: '待执行',
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    TERMINATED: '已中断',
    CANCELED: '已取消',
  };
  return map[upper] || status;
}

// Helper for status styling class
function statusClass(status: string): string {
  if (!status) return 'bg-slate-100 text-slate-500';
  const upper = status.toUpperCase();
  const map: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-500 border border-slate-200',
    RUNNING: 'bg-amber-100 text-amber-800 animate-pulse border border-amber-300',
    SUCCESS: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    FAILED: 'bg-rose-100 text-rose-800 border border-rose-300',
    TERMINATED: 'bg-slate-200 text-slate-700 border border-slate-300',
    CANCELED: 'bg-slate-200 text-slate-700 border border-slate-300',
  };
  return map[upper] || 'bg-slate-100 text-slate-500';
}

function getNodeStatus(nodeKey: string): string {
  return nodeStatuses[nodeKey] || 'PENDING';
}

function clearLogs() {
  logs.length = 0;
}

function addLog(level: string, message: string, timestamp?: string) {
  let timeStr = new Date().toTimeString().slice(0, 8);
  if (timestamp) {
    if (timestamp.includes('T')) {
      timeStr = timestamp.split('T')[1].slice(0, 8);
    } else if (timestamp.includes(' ')) {
      timeStr = timestamp.split(' ')[1].slice(0, 8);
    } else {
      timeStr = timestamp.slice(-8);
    }
  }

  logs.push({
    time: timeStr,
    level: level || 'info',
    message,
  });

  if (autoScroll.value) {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    });
  }
}

async function handleStopRun() {
  if (!currentRun.value?.id) return;
  try {
    await api.terminateRun(currentRun.value.id);
    addLog('warn', `用户主动通过前端发起了中断请求`);
  } catch (err) {
    stopRun(currentRun.value.id);
  }
}

function connectWebSocket(runId: number | string, token: string) {
  disconnect(); // Clear existing WS connection

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const wsUrl = `${protocol}//${hostname}:8080/ws/v1/runs/${runId}?token=${encodeURIComponent(token)}`;

  wsStatus.value = '连接中...';

  try {
    ws.value = new WebSocket(wsUrl);
  } catch (e) {
    const fallbackUrl = `${protocol}//${window.location.host}/ws/v1/runs/${runId}?token=${encodeURIComponent(token)}`;
    ws.value = new WebSocket(fallbackUrl);
  }

  ws.value.onopen = () => {
    wsStatus.value = '已连接';
    addLog('info', `WebSocket 长连接建立成功`);

    // 心跳（25 秒一次，服务端 30 秒超时）
    heartbeatTimer.value = window.setInterval(() => {
      if (ws.value?.readyState === WebSocket.OPEN) {
        ws.value.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 25000);
  };

  ws.value.onmessage = (event) => {
    try {
      const data: WebSocketEvent = JSON.parse(event.data);

      if (data.eventSeq && data.eventSeq > lastEventSeq.value) {
        lastEventSeq.value = data.eventSeq;
      }

      handleWebSocketEvent(data);
    } catch (err) {
      console.error('解析 WebSocket 事件异常:', err);
    }
  };

  ws.value.onerror = (error) => {
    console.error('WebSocket 通讯发生错误:', error);
    if (wsStatus.value !== '已完成') {
      wsStatus.value = '已断开';
    }
  };

  ws.value.onclose = () => {
    if (heartbeatTimer.value) {
      clearInterval(heartbeatTimer.value);
      heartbeatTimer.value = null;
    }

    if (!runFinished.value && currentRun.value && currentRun.value.status === 'RUNNING') {
      wsStatus.value = '重连中...';
      addLog('warn', `WebSocket 连接断开，3 秒后尝试自动重连...`);
      reconnectTimer.value = setTimeout(() => reconnect(runId, token), 3000);
    } else {
      if (runFinished.value) {
        wsStatus.value = '已完成';
      } else {
        wsStatus.value = '已断开';
      }
    }
  };
}

function handleWebSocketEvent(data: WebSocketEvent) {
  if (!currentRun.value) return;

  switch (data.eventType) {
    case 'RUN_STARTED':
      currentRun.value.status = 'RUNNING';
      runFinished.value = false;
      addLog('info', `工作流开始执行`, data.timestamp);
      break;

    case 'NODE_STARTED': {
      const nodeKey = data.nodeKey || 'node-1';
      nodeStatuses[nodeKey] = 'RUNNING';
      nodeOutputs[nodeKey] = '';
      if (!selectedNodeKey.value) selectedNodeKey.value = nodeKey;

      addLog('info', `节点 ${data.payload?.agentName || nodeKey} 开始执行`, data.timestamp);
      break;
    }

    case 'OUTPUT_CHUNK': {
      const nodeKey = data.nodeKey || selectedNodeKey.value || 'node-1';
      const chunk = data.payload?.chunk || '';
      nodeOutputs[nodeKey] = (nodeOutputs[nodeKey] || '') + chunk;

      if (!selectedNodeKey.value) {
        selectedNodeKey.value = nodeKey;
      }
      break;
    }

    case 'TOOL_CALLED': {
      const toolName = data.payload?.toolName || 'Tool';
      const args = typeof data.payload?.args === 'object'
        ? JSON.stringify(data.payload.args)
        : (data.payload?.args || '');
      addLog('info', `工具调用: ${toolName}(${args})`, data.timestamp);
      break;
    }

    case 'NODE_FINISHED': {
      const nodeKey = data.nodeKey || 'node-1';
      nodeStatuses[nodeKey] = 'SUCCESS';
      nodeTokens[nodeKey] = data.payload?.tokensUsed || 0;
      nodeDurations[nodeKey] = data.payload?.durationMs || 0;

      if (data.payload?.output) {
        nodeOutputs[nodeKey] = typeof data.payload.output === 'object'
          ? JSON.stringify(data.payload.output, null, 2)
          : String(data.payload.output);
      }

      addLog('info', `节点 ${nodeKey} 完成，Token: ${data.payload?.tokensUsed || 0}`, data.timestamp);
      break;
    }

    case 'NODE_FAILED': {
      const nodeKey = data.nodeKey || 'node-1';
      nodeStatuses[nodeKey] = 'FAILED';
      addLog('error', `节点 ${nodeKey} 失败: ${data.payload?.errorMsg || '报错终止'}`, data.timestamp);
      break;
    }

    case 'NODE_RETRYING': {
      const nodeKey = data.nodeKey || 'node-1';
      addLog('warn', `节点 ${nodeKey} 第 ${data.payload?.retryCount || 1} 次重试: ${data.payload?.reason || '自动重试'}`, data.timestamp);
      break;
    }

    case 'LOG': {
      addLog(data.payload?.level || 'info', data.payload?.message || '', data.timestamp);
      break;
    }

    case 'RUN_FINISHED': {
      const isSuccess = data.payload?.status === 'SUCCESS' || data.payload?.status === 'success';
      currentRun.value.status = isSuccess ? 'SUCCESS' : 'FAILED';
      if (data.payload?.duration) {
        currentRun.value.durationMs = data.payload.duration;
      }
      runFinished.value = true;
      wsStatus.value = '已完成';

      addLog(
        isSuccess ? 'info' : 'error',
        `工作流${isSuccess ? '执行完成' : '执行失败'}，耗时: ${data.payload?.duration || currentRun.value.durationMs || 0}ms`,
        data.timestamp
      );
      disconnect();
      break;
    }

    case 'REPLAY_RESULT': {
      if (data.payload?.replayedCount > 0) {
        addLog('info', `断线重连，已补发 ${data.payload.replayedCount} 条事件`, data.timestamp);
      }
      break;
    }

    case 'HEARTBEAT_ACK':
      break;
  }
}

function reconnect(runId: number | string, token: string) {
  if (runFinished.value) return;
  connectWebSocket(runId, token);

  setTimeout(() => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(
        JSON.stringify({
          type: 'replay',
          runId,
          lastEventSeq: lastEventSeq.value,
        })
      );
    }
  }, 500);
}

function disconnect() {
  if (heartbeatTimer.value) {
    clearInterval(heartbeatTimer.value);
    heartbeatTimer.value = null;
  }
  if (reconnectTimer.value) {
    clearTimeout(reconnectTimer.value);
    reconnectTimer.value = null;
  }
  if (ws.value) {
    ws.value.onclose = null;
    ws.value.close();
    ws.value = null;
  }
}

// Initialization Lifecycle
onMounted(async () => {
  const runId = state.selectedRunId || (state.runs[0] ? state.runs[0].id : null);
  if (!runId) return;

  // 1. Fetch run detail from Backend API
  try {
    const rawData = await api.getRun(runId);
    if (rawData) {
      currentRun.value = mapRunDtoToRunRecord ? mapRunDtoToRunRecord(rawData) : rawData;
    }
  } catch (err) {
    console.warn('后端获取执行单据失败，读取本地状态', err);
    const found = state.runs.find((r) => String(r.id) === String(runId));
    if (found) {
      currentRun.value = { ...found };
    }
  }

  // Initialize node states map
  if (currentRun.value) {
    for (const node of nodeList.value) {
      nodeStatuses[node.nodeKey] = (node.status || 'PENDING').toUpperCase();
    }
    if (nodeList.value.length > 0) {
      selectedNodeKey.value = nodeList.value[0].nodeKey;
    }
  }

  // 2. Establish WebSocket connection
  const token = tokenManager.getAccessToken() || 'mock-jwt-token';
  if (token && runId) {
    connectWebSocket(runId, token);
  }
});

onUnmounted(() => {
  disconnect();
});
</script>
