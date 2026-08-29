<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="state.mcpDrawerOpen"
      class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end"
      @click.self="closeDrawer"
    >
      <Transition
        enter-active-class="transition ease-out duration-300 transform"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition ease-in duration-200 transform"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div class="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200/90 flex flex-col justify-between overflow-hidden">
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

              <div>
                <label class="block font-semibold text-slate-700 mb-1">通信类型</label>
                <select
                  v-model="form.transportType"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  <option value="stdio">stdio (Standard I/O 命令行进程推流)</option>
                  <option value="SSE">SSE (Server-Sent Events 远程 HTTP 长连接)</option>
                </select>
              </div>

              <!-- Stdio Options -->
              <div v-if="form.transportType === 'stdio'" class="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-3">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">启动命令 (Command)</label>
                  <input
                    v-model="form.command"
                    type="text"
                    placeholder="npx / node / python"
                    class="w-full px-3 py-1.5 bg-slate-50/50 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">命令行参数 (Args, 逗号分隔)</label>
                  <input
                    v-model="argsString"
                    type="text"
                    placeholder="-y, @modelcontextprotocol/server-postgres"
                    class="w-full px-3 py-1.5 bg-slate-50/50 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <!-- SSE Options -->
              <div v-if="form.transportType === 'SSE'" class="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-3">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">SSE URL Endpoint</label>
                  <input
                    v-model="form.sseUrl"
                    type="text"
                    placeholder="http://localhost:8081/sse"
                    class="w-full px-3 py-1.5 bg-slate-50/50 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Server, X } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { MCPServer, MCPTransportType } from '../../types';

const { state, addMcpServer, updateMcpServer, hasPermission } = useAppStore();

const isEdit = computed(() => !!state.editingMcp);

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
