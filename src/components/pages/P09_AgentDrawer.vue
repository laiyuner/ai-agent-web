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
      v-if="state.agentDrawerOpen"
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
                <Bot class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-bold text-base text-slate-900 leading-tight">
                  {{ isEdit ? '配置与修改 Agent 智能体' : '新建特化 Agent 智能体' }}
                </h3>
                <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                  {{ isEdit ? `ID: ${state.editingAgent?.id}` : '定义提示词、模型温度与绑定工具' }}
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
            <!-- Section 1: Basic Info -->
            <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">基础身份信息</div>
              
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Agent 名称 <span class="text-rose-500">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="例如: PRD 需求提取专家"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">核心职责与描述</label>
                <textarea
                  v-model="form.description"
                  rows="2"
                  placeholder="简述该 Agent 的业务场景、思考模式与边界..."
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
                ></textarea>
              </div>
            </div>

            <!-- Section 2: Model & Reasoning -->
            <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">模型与推理架构</div>
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">推理架构类型</label>
                  <select
                    v-model="form.type"
                    class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="ReAct">ReAct (思考-行动循环)</option>
                    <option value="Functions">Function Call (原生函数回调)</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">LLM 供应商</label>
                  <select
                    v-model="form.llmProviderId"
                    @change="onProviderChange"
                    class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option v-for="p in state.llmProviders" :key="p.id" :value="p.id">
                      {{ p.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">基座模型版本</label>
                <select
                  v-model="form.model"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs"
                >
                  <option v-for="m in currentSupportedModels" :key="m" :value="m">
                    {{ m }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Section 3: System Prompt -->
            <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div class="flex items-center justify-between">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  System Prompt 角色指令 <span class="text-rose-500">*</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">{{ form.systemPrompt.length }} 字符</span>
              </div>
              <textarea
                v-model="form.systemPrompt"
                rows="6"
                placeholder="你是一名资深架构师... 请严格输出 JSON 格式。"
                class="w-full p-3 rounded-xl border border-slate-200 bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-inner"
              ></textarea>
            </div>

            <!-- Section 4: MCP Tools Binding -->
            <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div class="flex items-center justify-between">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">绑定 MCP 工具权限</div>
                <span class="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">
                  已选 {{ form.boundTools.length }} 个工具
                </span>
              </div>
              <div class="p-3 bg-white border border-slate-200/80 rounded-xl space-y-3 max-h-48 overflow-y-auto">
                <div v-for="mcp in state.mcpServers" :key="mcp.id" class="space-y-1.5">
                  <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>{{ mcp.name }}</span>
                  </div>
                  <div class="space-y-1.5 pl-3">
                    <label
                      v-for="tool in mcp.tools"
                      :key="tool.id"
                      class="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        :value="tool.id"
                        v-model="form.boundTools"
                        class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="font-mono font-bold text-slate-800 text-xs">{{ tool.name }}</div>
                        <div class="text-[10px] text-slate-400 line-clamp-1">{{ tool.description }}</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 5: Hyperparameters -->
            <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">运行限制与采样温度</div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="font-semibold text-slate-700">Temperature 采样</label>
                    <span class="font-mono font-bold text-indigo-600 tabular-nums">{{ form.temperature }}</span>
                  </div>
                  <input
                    v-model.number="form.temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    class="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div class="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                    <span>精确 (0.0)</span>
                    <span>创意 (1.0)</span>
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">超时阈值 (秒)</label>
                  <input
                    v-model.number="form.timeout"
                    type="number"
                    min="5"
                    max="300"
                    class="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              v-if="(isEdit && hasPermission('agent:update')) || (!isEdit && hasPermission('agent:create'))"
              @click="handleSubmit"
              class="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer btn-tactile"
            >
              <Bot class="w-3.5 h-3.5" />
              <span>{{ isEdit ? '保存智能体配置' : '确认创建智能体' }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Bot, X } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { Agent, AgentType } from '../../types';

const { state, addAgent, updateAgent, hasPermission } = useAppStore();

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
