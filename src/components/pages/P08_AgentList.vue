<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Bot class="w-6 h-6 text-indigo-600" />
          <span>Agent 智能体资产池 (Agent Intelligence Pool)</span>
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          配置特定领域 Role 提示词、温度采样率与 Model Context Protocol 工具调用白名单
        </p>
      </div>

      <button
        v-if="hasPermission('agent:create')"
        @click="openCreateDrawer"
        class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>创建特化 Agent</span>
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
      <div class="relative w-full sm:w-80">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索 Agent 名称、System Prompt 或创建者..."
          class="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>

    <!-- Agent Cards Grid (Fluid 3 Columns) -->
    <div v-if="filteredAgents.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="ag in filteredAgents"
        :key="ag.id"
        class="bg-white rounded-3xl border border-slate-200 hover:border-slate-400 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-5 group"
      >
        <div class="space-y-3.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 font-extrabold text-base">
                {{ ag.name.slice(0, 1) }}
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-base sm:text-lg group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {{ ag.name }}
                </h3>
                <div class="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                  <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-100">
                    {{ ag.type }}
                  </span>
                  <span>{{ ag.llmProviderName }} ({{ ag.model }})</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button
                v-if="hasPermission('agent:clone')"
                @click="copyAgent(ag.id)"
                title="克隆 Agent"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Copy class="w-4 h-4" />
              </button>
              <button
                v-if="hasPermission('agent:delete')"
                @click="deleteAgent(ag.id)"
                title="移除"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed min-h-[40px]">
            {{ ag.description }}
          </p>

          <!-- System Prompt Excerpt -->
          <div class="p-3.5 rounded-2xl bg-slate-950 text-slate-200 space-y-1 font-mono text-xs">
            <div class="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">System Prompt 角色指令</div>
            <p class="line-clamp-2 text-slate-300 leading-snug">{{ ag.systemPrompt }}</p>
          </div>

          <!-- Parameters Summary -->
          <div class="grid grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 font-mono">
            <div>
              <span class="block text-slate-400 text-[10px]">Temperature</span>
              <span class="font-bold text-slate-800">{{ ag.temperature }}</span>
            </div>
            <div>
              <span class="block text-slate-400 text-[10px]">超时阈值</span>
              <span class="font-bold text-slate-800">{{ ag.timeout }}s</span>
            </div>
            <div>
              <span class="block text-slate-400 text-[10px]">绑定 MCP</span>
              <span class="font-bold text-indigo-600">{{ ag.boundTools.length }} 个</span>
            </div>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs text-slate-400 font-mono">创建人: {{ ag.creator }}</span>
          <button
            @click="openEditDrawer(ag)"
            class="px-4 py-2 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders class="w-4 h-4" />
            <span>{{ hasPermission('agent:update') ? '配置 Agent' : '查看详情' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <Bot class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">暂无 Agent 智能体记录</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">当前资产池中无智能体配置，请点击右上角创建特化 Agent。</p>
      </div>
      <button
        v-if="hasPermission('agent:create')"
        @click="openCreateDrawer"
        class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>创建特化 Agent</span>
      </button>
    </div>

    <!-- Agent Drawer -->
    <P09_AgentDrawer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Bot, Plus, Search, Copy, Trash2, Sliders } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import P09_AgentDrawer from './P09_AgentDrawer.vue';
import { Agent } from '../../types';

const { state, copyAgent, deleteAgent, fetchAgents, hasPermission } = useAppStore();

const searchQuery = ref('');

let searchTimer: any = null;
watch(searchQuery, (newVal) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fetchAgents(newVal);
  }, 300);
});

const filteredAgents = computed(() => {
  return state.agents.filter((ag) => {
    return (
      ag.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      ag.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      ag.systemPrompt.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });
});

function openCreateDrawer() {
  state.editingAgent = null;
  state.agentDrawerOpen = true;
}

function openEditDrawer(ag: Agent) {
  state.editingAgent = ag;
  state.agentDrawerOpen = true;
}
</script>
