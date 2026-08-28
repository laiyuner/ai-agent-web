<template>
  <div
    v-if="state.mcpDrawerOpen"
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end"
  >
    <div class="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <Server class="w-5 h-5 text-indigo-600" />
            <h3 class="font-bold text-base text-slate-900">
              {{ isEdit ? '修改 MCP 工具服务器配置' : '注册新 MCP 服务 (Model Context Protocol)' }}
            </h3>
          </div>
          <button @click="closeDrawer" class="text-slate-400 hover:text-slate-700">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form Fields -->
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">MCP 服务器名称 *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="例如: GitHub Repo MCP Server"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">描述与扩展功能</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="说明暴露的 Tool、Resource 或 Prompt 模板..."
              class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">协议传输架构 (Transport)</label>
            <select
              v-model="form.transportType"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="stdio">stdio (Standard I/O 命令行进程推流)</option>
              <option value="SSE">SSE (Server-Sent Events 远程 HTTP 长连接)</option>
            </select>
          </div>

          <!-- Stdio Options -->
          <div v-if="form.transportType === 'stdio'" class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">启动命令 (Command)</label>
              <input
                v-model="form.command"
                type="text"
                placeholder="npx / node / python"
                class="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">命令行参数 (Args, 逗号分隔)</label>
              <input
                v-model="argsString"
                type="text"
                placeholder="-y, @modelcontextprotocol/server-postgres"
                class="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <!-- SSE Options -->
          <div v-if="form.transportType === 'SSE'" class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">SSE URL Endpoint</label>
              <input
                v-model="form.sseUrl"
                type="text"
                placeholder="http://localhost:8081/sse"
                class="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
        <button
          @click="closeDrawer"
          class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
        >
          取消
        </button>
        <button
          v-if="(isEdit && hasPermission('mcp_server:update')) || (!isEdit && hasPermission('mcp_server:create'))"
          @click="handleSubmit"
          class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
        >
          {{ isEdit ? '保存修改' : '连接 MCP 服务' }}
        </button>
      </div>
    </div>
  </div>
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
