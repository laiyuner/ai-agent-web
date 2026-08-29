<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="state.agentDrawerOpen"
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

            <!-- Section 4: MCP Server Binding -->
            <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div class="flex items-center justify-between">
                <label class="block font-semibold text-slate-700">绑定 MCP 服务器</label>
                <span class="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">
                  已选 {{ boundServerIds.length }} 个服务器
                </span>
              </div>
              <p class="text-[10px] text-slate-400 leading-relaxed">
                勾选需要挂载到该 Agent 的 MCP 服务器；勾选后可填写工具白名单（逗号分隔工具名），
                留空表示启用该服务器的全部工具。
              </p>
              <div class="p-3 bg-white border border-slate-200/80 rounded-xl space-y-2.5 max-h-52 overflow-y-auto">
                <div v-if="state.mcpServers.length === 0" class="text-[11px] text-slate-400 py-3 text-center">
                  暂无可用的 MCP 服务器（列表为空或加载失败）
                </div>
                <div
                  v-for="mcp in state.mcpServers"
                  :key="mcp.id"
                  class="space-y-1.5 border-b border-slate-100 last:border-0 pb-2.5 last:pb-0"
                >
                  <label class="flex items-center justify-between cursor-pointer text-slate-800 font-medium">
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        :value="mcp.id"
                        v-model="boundServerIds"
                        class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span class="text-xs font-semibold">{{ mcp.name }}</span>
                    </div>
                    <span
                      class="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      :class="mcp.status === 'connected' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80' : 'bg-slate-100 text-slate-400'"
                    >
                      {{ mcp.status === 'connected' ? '已启用' : '已停用' }}
                    </span>
                  </label>
                  <div v-if="boundServerIds.includes(mcp.id)" class="pl-6 pr-1">
                    <input
                      :value="toolsWhitelistInput(mcp.id)"
                      @input="updateToolsWhitelist(mcp.id, ($event.target as HTMLInputElement).value)"
                      type="text"
                      :placeholder="`工具白名单，如：pg_query, pg_schema（留空 = 全部工具）`"
                      class="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-all"
                    />
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
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Bot, X } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { Agent, AgentType, AgentMcpBinding } from '../../types';

const { state, addAgent, updateAgent, hasPermission } = useAppStore();

const isEdit = computed(() => !!state.editingAgent);

const form = ref({
  name: '',
  description: '',
  type: 'ReAct' as AgentType,
  llmProviderId: 'zhipu',
  llmProviderName: '智谱 BigModel',
  model: 'glm-4-flash',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: '',
  boundTools: [] as string[],
  mcpBindings: [] as AgentMcpBinding[],
  timeout: 60,
  maxRetries: 3,
  retryBackoffMs: 1000,
  isPublic: true,
});

/** 当前勾选绑定的 MCP 服务器 ID 列表（checkbox v-model） */
const boundServerIds = ref<string[]>([]);

/** 编辑回显：把 Agent.mcpBindings 同步到勾选列表与白名单输入 */
watch(
  () => state.editingAgent,
  (newVal) => {
    if (newVal) {
      form.value = {
        ...newVal,
        mcpBindings: newVal.mcpBindings ? [...newVal.mcpBindings] : [],
        boundTools: newVal.boundTools ? [...newVal.boundTools] : [],
      };
      boundServerIds.value = (newVal.mcpBindings || []).map((b) => b.mcpServerId);
    } else {
      form.value = {
        name: '',
        description: '',
        type: 'ReAct',
        llmProviderId: 'zhipu',
        llmProviderName: '智谱 BigModel',
        model: 'glm-4-flash',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: '',
        boundTools: [],
        mcpBindings: [],
        timeout: 60,
        maxRetries: 3,
        retryBackoffMs: 1000,
        isPublic: true,
      };
      boundServerIds.value = [];
    }
  },
  { immediate: true }
);

/** 读取某 MCP 的白名单输入值（逗号分隔字符串） */
function toolsWhitelistInput(mcpServerId: string): string {
  const binding = form.value.mcpBindings.find((b) => b.mcpServerId === mcpServerId);
  return binding ? binding.enabledTools.join(', ') : '';
}

/** 白名单输入变更：解析逗号分隔的工具名并写入 form.mcpBindings */
function updateToolsWhitelist(mcpServerId: string, raw: string) {
  const tools = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const existing = form.value.mcpBindings.find((b) => b.mcpServerId === mcpServerId);
  if (existing) {
    existing.enabledTools = tools;
  } else {
    const mcp = state.mcpServers.find((m) => m.id === mcpServerId);
    form.value.mcpBindings.push({
      mcpServerId,
      mcpServerName: mcp?.name || '',
      enabledTools: tools,
    });
  }
}

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

async function handleSubmit() {
  if (!form.value.name || !form.value.systemPrompt) {
    return;
  }
  // 同步勾选的 MCP 到绑定列表（取消勾选 = 移除绑定）
  form.value.mcpBindings = boundServerIds.value.map((id) => {
    const existing = form.value.mcpBindings.find((b) => b.mcpServerId === id);
    const mcp = state.mcpServers.find((m) => m.id === id);
    return {
      mcpServerId: id,
      mcpServerName: existing?.mcpServerName || mcp?.name || '',
      enabledTools: existing?.enabledTools || [],
    };
  });
  // 派生扁平工具列表
  form.value.boundTools = form.value.mcpBindings.flatMap((b) => b.enabledTools);

  if (isEdit.value && state.editingAgent) {
    await updateAgent(state.editingAgent.id, form.value);
  } else {
    await addAgent(form.value);
  }
  closeDrawer();
}
</script>
