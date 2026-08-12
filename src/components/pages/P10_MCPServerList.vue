<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Server class="w-6 h-6 text-indigo-600" />
          <span>MCP 工具扩展服务器 (Model Context Protocol Servers)</span>
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          与 Anthropic/OpenAI 开源 Model Context Protocol 对齐，暴露 stdio 进程命令行与 SSE 远程 RPC 接口
        </p>
      </div>

      <button
        @click="openCreateDrawer"
        class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>注册新 MCP 服务器</span>
      </button>
    </div>

    <!-- MCP Servers List (Fluid Grid) -->
    <div v-if="state.mcpServers.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="mcp in state.mcpServers"
        :key="mcp.id"
        class="bg-white rounded-3xl border border-slate-200 hover:border-slate-400 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-5"
      >
        <div class="space-y-3.5">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-bold text-slate-900 text-base sm:text-lg">{{ mcp.name }}</span>
                <span
                  class="text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5"
                  :class="mcp.status === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
                >
                  <span class="w-2 h-2 rounded-full" :class="mcp.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
                  <span>{{ mcp.status === 'connected' ? '已握手' : '断开' }}</span>
                </span>
              </div>
              <div class="text-xs text-slate-500 font-mono">
                传输方式: <strong class="text-slate-800 uppercase">{{ mcp.transportType }}</strong>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button @click="testMcpServer(mcp.id)" title="探针连通测试" class="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer">
                <Activity class="w-4 h-4" />
              </button>

              <button @click="deleteMcpServer(mcp.id)" title="移除" class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {{ mcp.description }}
          </p>

          <!-- Stdio / SSE Details -->
          <div class="p-3.5 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs space-y-1">
            <div class="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">通讯句柄接口</div>
            <div v-if="mcp.transportType === 'stdio'" class="text-indigo-300 truncate">
              $ {{ mcp.command }} {{ (mcp.args || []).join(' ') }}
            </div>
            <div v-else class="text-emerald-300 truncate">
              SSE Endpoint: {{ mcp.sseUrl }}
            </div>
          </div>

          <!-- Tools List -->
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">导出的 MCP 工具 ({{ mcp.toolsCount }})</div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="t in mcp.tools"
                :key="t.id"
                class="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold border border-slate-200/90 flex items-center gap-1.5"
              >
                <Zap class="w-3.5 h-3.5 text-amber-500" />
                <span>{{ t.name }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>更新于: {{ mcp.updatedAt }}</span>
          <button
            @click="openEditDrawer(mcp)"
            class="px-3.5 py-1.5 text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            编辑参数
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <Server class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">暂无 MCP 服务器记录</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">尚未连接外部 Model Context Protocol 探针，点击下方进行新增注册。</p>
      </div>
      <button @click="openCreateDrawer" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer">
        <Plus class="w-3.5 h-3.5" />
        <span>注册新 MCP 服务器</span>
      </button>
    </div>

    <P11_MCPServerDrawer />
  </div>
</template>

<script setup lang="ts">
import { Server, Plus, Activity, Trash2, Zap } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import P11_MCPServerDrawer from './P11_MCPServerDrawer.vue';
import { MCPServer } from '../../types';

const { state, testMcpServer, deleteMcpServer } = useAppStore();

function openCreateDrawer() {
  state.editingMcp = null;
  state.mcpDrawerOpen = true;
}

function openEditDrawer(mcp: MCPServer) {
  state.editingMcp = mcp;
  state.mcpDrawerOpen = true;
}
</script>
