<template>
  <div
    v-if="state.agentDrawerOpen"
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end"
  >
    <div class="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <Bot class="w-5 h-5 text-indigo-600" />
            <h3 class="font-bold text-base text-slate-900">
              {{ isEdit ? '配置与修改 Agent 智能体' : '新建特化 Agent 智能体' }}
            </h3>
          </div>
          <button @click="closeDrawer" class="text-slate-400 hover:text-slate-700">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form Fields -->
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Agent 名称 *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="例如: PRD 需求提取专家"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">核心职责与描述</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="简述该 Agent 的业务场景、思考模式与边界..."
              class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">推理架构类型</label>
              <select
                v-model="form.type"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ReAct">ReAct (思考-行动循环)</option>
                <option value="Functions">Function Call (原生函数回调)</option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">LLM 供应商模型</label>
              <select
                v-model="form.llmProviderId"
                @change="onProviderChange"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option v-for="p in state.llmProviders" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">选择具体模型</label>
            <select
              v-model="form.model"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option v-for="m in currentSupportedModels" :key="m" :value="m">
                {{ m }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">System Prompt 角色提示词 *</label>
            <textarea
              v-model="form.systemPrompt"
              rows="5"
              placeholder="你是一名资深架构师... 请严格输出 JSON 格式。"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <!-- MCP Tools Binding -->
          <div>
            <label class="block font-semibold text-slate-700 mb-1.5">绑定 MCP 工具权限</label>
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-36 overflow-y-auto">
              <div v-for="mcp in state.mcpServers" :key="mcp.id" class="space-y-1">
                <div class="text-[10px] font-semibold text-slate-400 uppercase">{{ mcp.name }}</div>
                <div class="space-y-1 pl-2">
                  <label
                    v-for="tool in mcp.tools"
                    :key="tool.id"
                    class="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900"
                  >
                    <input
                      type="checkbox"
                      :value="tool.id"
                      v-model="form.boundTools"
                      class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{{ tool.name }} ({{ tool.description }})</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Temperature 采样温度 ({{ form.temperature }})</label>
              <input
                v-model.number="form.temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                class="w-full"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">超时时长 (s)</label>
              <input
                v-model.number="form.timeout"
                type="number"
                class="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          @click="handleSubmit"
          class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-colors"
        >
          {{ isEdit ? '保存修改' : '确认创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Bot, X } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { Agent, AgentType } from '../../types';

const { state, addAgent, updateAgent } = useAppStore();

const isEdit = computed(() => !!state.editingAgent);

const form = ref({
  name: '',
  description: '',
  type: 'ReAct' as AgentType,
  llmProviderId: 'llm-1',
  llmProviderName: '智谱 GLM-4',
  model: 'glm-4-flash',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: '',
  boundTools: [] as string[],
  timeout: 60,
  maxRetries: 3,
  retryBackoffMs: 1000,
  isPublic: true,
});

watch(
  () => state.editingAgent,
  (newVal) => {
    if (newVal) {
      form.value = { ...newVal };
    } else {
      form.value = {
        name: '',
        description: '',
        type: 'ReAct',
        llmProviderId: 'llm-1',
        llmProviderName: '智谱 GLM-4',
        model: 'glm-4-flash',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: '',
        boundTools: [],
        timeout: 60,
        maxRetries: 3,
        retryBackoffMs: 1000,
        isPublic: true,
      };
    }
  },
  { immediate: true }
);

const currentSupportedModels = computed(() => {
  const p = state.llmProviders.find((x) => x.id === form.value.llmProviderId);
  return p ? p.supportedModels : ['gpt-4o'];
});

function onProviderChange() {
  const p = state.llmProviders.find((x) => x.id === form.value.llmProviderId);
  if (p) {
    form.value.llmProviderName = p.name;
    form.value.model = p.defaultModel;
  }
}

function closeDrawer() {
  state.agentDrawerOpen = false;
  state.editingAgent = null;
}

function handleSubmit() {
  if (!form.value.name || !form.value.systemPrompt) {
    return;
  }
  if (isEdit.value && state.editingAgent) {
    updateAgent(state.editingAgent.id, form.value);
  } else {
    addAgent(form.value);
  }
  closeDrawer();
}
</script>
