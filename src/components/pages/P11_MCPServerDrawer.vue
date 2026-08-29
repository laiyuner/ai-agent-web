<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="state.mcpDrawerOpen"
        class="fixed inset-0 z-50 overflow-hidden flex justify-end"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop with smooth opacity fade -->
        <div
          class="drawer-backdrop fixed inset-0 bg-slate-900/25 backdrop-blur-[2px] cursor-pointer"
          @click="closeDrawer"
        />

        <!-- Slide-over Drawer Panel -->
        <div
          class="drawer-panel relative z-10 w-full max-w-xl bg-white h-full shadow-[-12px_0_40px_-6px_rgba(15,23,42,0.14)] border-l border-slate-200/90 flex flex-col justify-between overflow-hidden"
        >
          <!-- Sticky Header -->
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-10 shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs">
                <Server class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-bold text-base text-slate-900 leading-tight">
                  {{ isEdit ? '修改 MCP 工具服务器配置' : '注册新 MCP 服务 (Model Context Protocol)' }}
                </h3>
                <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                  {{ isEdit ? `ID: ${state.editingMcp?.id}` : '配置 stdio 进程命令行或 SSE 远程服务端点' }}
                </p>
              </div>
            </div>
            <button
              @click="closeDrawer"
              class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer btn-tactile"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Scrollable Form Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            <!-- Basic Info -->
            <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">服务器定义</div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">MCP 服务器名称 <span class="text-rose-500">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="例如: GitHub Repo MCP Server"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">描述与扩展功能</label>
                <textarea
                  v-model="form.description"
                  rows="2"
                  placeholder="说明暴露的 Tool、Resource 或 Prompt 模板..."
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
                ></textarea>
              </div>
            </div>

            <!-- Protocol & Transport -->
            <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">协议传输架构 (Transport)</div>

              <!-- Custom Transport Dropdown Popover -->
              <div class="relative custom-mcp-dropdown" ref="transportDropdownRef">
                <label class="block font-semibold text-slate-700 mb-1">通信类型</label>
                <button
                  type="button"
                  @click.stop="isTransportDropdownOpen = !isTransportDropdownOpen"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs"
                >
                  <div class="flex items-center gap-2.5 truncate">
                    <div
                      class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                      :class="form.transportType === 'stdio' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'"
                    >
                      <Terminal v-if="form.transportType === 'stdio'" class="w-3.5 h-3.5" />
                      <Radio v-else class="w-3.5 h-3.5" />
                    </div>
                    <span class="font-semibold text-slate-800 text-xs">
                      {{ form.transportType === 'stdio' ? 'stdio (本地命令行进程推流)' : 'SSE (远程 HTTP Server-Sent Events)' }}
                    </span>
                  </div>
                  <ChevronDown
                    class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200"
                    :class="{ 'rotate-180 text-indigo-600': isTransportDropdownOpen }"
                  />
                </button>

                <!-- Dropdown Menu -->
                <Transition name="dropdown-pop">
                  <div
                    v-if="isTransportDropdownOpen"
                    class="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 space-y-1.5 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
                    @click.stop
                  >
                    <!-- stdio option -->
                    <div
                      @click="selectTransport('stdio')"
                      class="p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5"
                      :class="form.transportType === 'stdio' ? 'bg-indigo-50/80 border-indigo-200/90 text-indigo-950' : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'"
                    >
                      <div class="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Terminal class="w-4 h-4" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-xs">stdio (Standard I/O)</span>
                          <span class="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">推荐本地</span>
                        </div>
                        <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          子进程标准输入输出命令行调用，低延迟直接对接本地 npm/pip 算子包
                        </p>
                      </div>
                      <Check v-if="form.transportType === 'stdio'" class="w-4 h-4 text-indigo-600 shrink-0 mt-1" />
                    </div>

                    <!-- SSE option -->
                    <div
                      @click="selectTransport('SSE')"
                      class="p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5"
                      :class="form.transportType === 'SSE' ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950' : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'"
                    >
                      <div class="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Radio class="w-4 h-4" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-xs">SSE (Server-Sent Events)</span>
                          <span class="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">远程微服务</span>
                        </div>
                        <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          基于 HTTP 长连接的远程 RPC 服务端点，适合跨容器或公网云服务对接
                        </p>
                      </div>
                      <Check v-if="form.transportType === 'SSE'" class="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                    </div>
                  </div>
                </Transition>
              </div>

              <!-- Stdio Options -->
              <div v-if="form.transportType === 'stdio'" class="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">启动命令 (Command)</label>
                  <input
                    v-model="form.command"
                    type="text"
                    placeholder="例如: npx / node / python"
                    class="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">命令行参数 (Args, 逗号分隔)</label>
                  <input
                    v-model="argsString"
                    type="text"
                    placeholder="-y, @modelcontextprotocol/server-postgres"
                    class="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <!-- SSE Options -->
              <div v-if="form.transportType === 'SSE'" class="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-2xs">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">SSE URL Endpoint</label>
                  <input
                    v-model="form.sseUrl"
                    type="text"
                    placeholder="http://localhost:8081/sse"
                    class="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Sticky Footer Action Bar -->
          <div class="p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0 sticky bottom-0 z-10 shadow-lg">
            <button
              @click="closeDrawer"
              class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer btn-tactile"
            >
              取消
            </button>
            <button
              v-if="(isEdit && hasPermission('mcp_server:update')) || (!isEdit && hasPermission('mcp_server:create'))"
              @click="handleSubmit"
              class="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer btn-tactile"
            >
              <Server class="w-3.5 h-3.5" />
              <span>{{ isEdit ? '保存修改' : '连接 MCP 服务' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  Server,
  X,
  ChevronDown,
  Check,
  Terminal,
  Radio,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { MCPServer, MCPTransportType } from '../../types';

const { state, addMcpServer, updateMcpServer, hasPermission } = useAppStore();

const isEdit = computed(() => !!state.editingMcp);

const isTransportDropdownOpen = ref(false);
const transportDropdownRef = ref<HTMLElement | null>(null);

function selectTransport(type: MCPTransportType) {
  form.value.transportType = type;
  isTransportDropdownOpen.value = false;
}

function handleDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.custom-mcp-dropdown')) {
    isTransportDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});

const form = ref({
  name: '',
  description: '',
  transportType: 'stdio' as MCPTransportType,
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  sseUrl: 'http://localhost:8081/sse',
  toolWhitelist: [] as string[],
  tools: [
    { id: `t-${Date.now()}`, name: 'mcp_generic_tool', description: 'MCP 动态导出的基础工具算子' },
  ],
});

const argsString = ref(form.value.args.join(', '));

watch(
  () => state.editingMcp,
  (newVal) => {
    if (newVal) {
      form.value = { ...newVal };
      argsString.value = (newVal.args || []).join(', ');
    } else {
      form.value = {
        name: '',
        description: '',
        transportType: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        sseUrl: 'http://localhost:8081/sse',
        toolWhitelist: [],
        tools: [
          { id: `t-${Date.now()}`, name: 'mcp_generic_tool', description: 'MCP 动态导出的基础工具算子' },
        ],
      };
      argsString.value = '-y, @modelcontextprotocol/server-github';
    }
  },
  { immediate: true }
);

function closeDrawer() {
  state.mcpDrawerOpen = false;
  state.editingMcp = null;
}

function handleSubmit() {
  if (!form.value.name) return;

  const parsedArgs = argsString.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    ...form.value,
    args: parsedArgs,
  };

  if (isEdit.value && state.editingMcp) {
    updateMcpServer(state.editingMcp.id, payload);
  } else {
    addMcpServer(payload);
  }
  closeDrawer();
}
</script>
