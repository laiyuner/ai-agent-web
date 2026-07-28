<template>
  <div class="p-6 lg:p-8 w-full space-y-6 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Cpu class="w-6 h-6" />
          </div>
          <span>LLM 大模型供应商与网关配置</span>
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          统一管理与监控 OpenAI 兼容协议、智谱 BigModel、通义千问及本地私有化 (Ollama/vLLM) 接入基点与 API 凭证
        </p>
      </div>

      <!-- Right Actions: Add Provider Button -->
      <div class="flex items-center gap-3 shrink-0">
        <button
          @click="openAddModal"
          class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus class="w-4 h-4 text-emerald-400" />
          <span>添加自定义 LLM 供应商</span>
        </button>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
      <!-- Category Tabs -->
      <div class="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-full sm:w-auto">
        <button
          v-for="tab in filterTabs"
          :key="tab.id"
          @click="activeFilter = tab.id"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-none text-center"
          :class="activeFilter === tab.id ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
        >
          {{ tab.label }}
          <span class="ml-1 text-[10px] px-1.5 py-0.2 rounded-full" :class="activeFilter === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'">
            {{ getCountByFilter(tab.id) }}
          </span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full sm:w-72">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索供应商名称、Base URL 或模型..."
          class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>
    </div>

    <!-- Providers List Grid -->
    <div v-if="filteredProviders.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="p in filteredProviders"
        :key="p.id"
        class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-5 min-w-0 transition-all hover:shadow-md hover:border-slate-300"
      >
        <!-- Card Top Section -->
        <div class="space-y-4 min-w-0">
          <!-- Card Header: Provider Icon, Name, Status, and Test Button -->
          <div class="flex items-start justify-between gap-3 min-w-0">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <!-- Brand Badge Icon -->
              <div
                class="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border"
                :class="getBrandStyle(p.code).bgClass"
              >
                <component :is="getBrandStyle(p.code).icon" class="w-5 h-5" :class="getBrandStyle(p.code).textClass" />
              </div>

              <!-- Provider Name & Status Badge -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                  <h3 class="font-bold text-slate-900 text-base truncate" :title="p.name">
                    {{ p.name }}
                  </h3>
                </div>

                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0"
                    :class="
                      p.status === 'configured'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                    "
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="p.status === 'configured' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'"></span>
                    {{ p.status === 'configured' ? '已配置 Key' : '未设置密钥' }}
                  </span>

                  <span class="text-[11px] text-slate-400 font-medium truncate">
                    {{ p.isBuiltIn ? '原生内置' : '自定义拓展' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Test Connection Button (Matching global unified button style) -->
            <button
              @click="testLlmProvider(p.id)"
              title="测试 Endpoint 握手连通性与响应延时"
              class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-200/80 hover:border-indigo-300 transition-all flex items-center gap-1.5 group cursor-pointer shadow-2xs shrink-0 mt-0.5"
            >
              <Activity class="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>测试</span>
            </button>
          </div>

          <!-- Base URL Display Box (Single line with copy button & truncation protection) -->
          <div class="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2.5 space-y-1 min-w-0">
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>API Base URL Endpoint</span>
              <span class="font-mono text-[10px] text-slate-400">REST / v1</span>
            </div>

            <div class="flex items-center justify-between gap-2 min-w-0">
              <span
                class="font-mono text-xs text-slate-800 font-semibold truncate min-w-0 select-all"
                :title="p.baseUrl"
              >
                {{ p.baseUrl }}
              </span>

              <button
                @click="copyToClipboard(p.baseUrl)"
                class="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors shrink-0 cursor-pointer"
                title="复制 Base URL"
              >
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Supported Models List Section -->
          <div class="space-y-2 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">支持模型 ({{ p.supportedModels.length }})</span>
              
              <!-- Quick Add Model Link -->
              <button
                @click="promptAddModel(p.id)"
                class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus class="w-3 h-3" />
                <span>挂载模型</span>
              </button>
            </div>

            <div class="flex flex-wrap gap-1.5 min-w-0 max-h-32 overflow-y-auto scrollbar-thin pr-1">
              <div
                v-for="m in p.supportedModels"
                :key="m"
                @click="setDefaultModel(p.id, m)"
                title="点击设置为当前供应商的默认全局模型"
                class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-mono transition-all cursor-pointer border min-w-0 max-w-[200px]"
                :class="
                  m === p.defaultModel
                    ? 'bg-indigo-50 text-indigo-700 font-bold border-indigo-200 shadow-2xs'
                    : 'bg-slate-100/80 text-slate-600 border-slate-200/80 hover:bg-slate-200/80 hover:text-slate-900'
                "
              >
                <Star v-if="m === p.defaultModel" class="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                <span class="truncate">{{ m }}</span>
                <span v-if="m === p.defaultModel" class="text-[9px] bg-indigo-200/60 text-indigo-800 px-1 rounded shrink-0">默认</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Bottom Section: API Key Configuration Form -->
        <div class="pt-4 border-t border-slate-100 space-y-2.5 min-w-0">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-slate-800">设置 / 切换 API Key</label>
            <span class="text-[11px] text-slate-400">
              {{ p.apiKeyConfigured ? '密钥掩码已上锁' : '暂无配置密钥' }}
            </span>
          </div>

          <div class="flex items-center gap-2 min-w-0">
            <div class="relative flex-1 min-w-0">
              <KeyRound class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                v-model="keyInputs[p.id]"
                :type="showKeys[p.id] ? 'text' : 'password'"
                :placeholder="p.apiKeyConfigured ? '•••••••••••••••• (密文存储中)' : 'sk-********************************'"
                class="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/40 focus:bg-white transition-all"
              />
              <button
                @click="showKeys[p.id] = !showKeys[p.id]"
                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                :title="showKeys[p.id] ? '隐藏密文' : '显示明文'"
              >
                <EyeOff v-if="showKeys[p.id]" class="w-3.5 h-3.5" />
                <Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              @click="saveKey(p.id)"
              class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              更新
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
        <Search class="w-6 h-6" />
      </div>
      <h3 class="text-base font-bold text-slate-800">未找到匹配的 LLM 供应商</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        尝试调整关键词或切换筛选分类，亦可点击右上角添加自定义大模型 Endpoint
      </p>
    </div>

    <!-- Add Custom LLM Provider Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
    >
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Cpu class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base">注册自定义大模型供应商</h3>
              <p class="text-xs text-slate-500">对接 OpenAI Standard API / FastGPT / DeepSeek 或专有网关</p>
            </div>
          </div>
          <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">&times;</button>
        </div>

        <form @submit.prevent="submitNewProvider" class="space-y-4 text-xs sm:text-sm">
          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700">供应商展示名称 <span class="text-rose-500">*</span></label>
            <input
              v-model="newForm.name"
              required
              type="text"
              placeholder="例如：DeepSeek 官方 API / Azure OpenAI / OpenRouter"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="block font-bold text-slate-700">唯一标识 Code <span class="text-rose-500">*</span></label>
              <input
                v-model="newForm.code"
                required
                type="text"
                placeholder="deepseek / azure / vllm"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block font-bold text-slate-700">默认主推荐模型 <span class="text-rose-500">*</span></label>
              <input
                v-model="newForm.defaultModel"
                required
                type="text"
                placeholder="deepseek-chat / gpt-4o"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700">API Base URL Endpoint <span class="text-rose-500">*</span></label>
            <input
              v-model="newForm.baseUrl"
              required
              type="text"
              placeholder="https://api.deepseek.com/v1/"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700">初始 API Key 密钥 (可选)</label>
            <input
              v-model="newForm.apiKey"
              type="password"
              placeholder="sk-****************"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700">支持模型清单 (英文逗号分割)</label>
            <input
              v-model="newForm.modelsStr"
              type="text"
              placeholder="deepseek-chat, deepseek-reasoner, deepseek-coder"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div class="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              @click="showAddModal = false"
              class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
            >
              保存并完成注册
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import {
  Cpu,
  Activity,
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Copy,
  Star,
  Search,
  Sparkles,
  Zap,
  Globe,
  HardDrive,
  Server,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';

const {
  state,
  updateLlmProvider,
  addLlmProvider,
  addModelToProvider,
  setDefaultModel,
  testLlmProvider,
  addToast,
} = useAppStore();

const searchQuery = ref('');
const activeFilter = ref<'all' | 'configured' | 'unconfigured' | 'local'>('all');

const filterTabs = [
  { id: 'all', label: '全部供应商' },
  { id: 'configured', label: '已配置凭证' },
  { id: 'unconfigured', label: '待补全密钥' },
  { id: 'local', label: '私有化 / Local' },
];

const keyInputs = reactive<Record<string, string>>({});
const showKeys = reactive<Record<string, boolean>>({});

// Modal State
const showAddModal = ref(false);
const newForm = reactive({
  name: '',
  code: '',
  baseUrl: '',
  apiKey: '',
  defaultModel: '',
  modelsStr: '',
});

function getCountByFilter(filterId: string) {
  if (filterId === 'all') return state.llmProviders.length;
  if (filterId === 'configured') return state.llmProviders.filter((p) => p.status === 'configured').length;
  if (filterId === 'unconfigured') return state.llmProviders.filter((p) => p.status !== 'configured').length;
  if (filterId === 'local') return state.llmProviders.filter((p) => p.baseUrl.includes('localhost') || p.code === 'ollama').length;
  return 0;
}

const filteredProviders = computed(() => {
  return state.llmProviders.filter((p) => {
    // Filter Tab
    if (activeFilter.value === 'configured' && p.status !== 'configured') return false;
    if (activeFilter.value === 'unconfigured' && p.status === 'configured') return false;
    if (activeFilter.value === 'local' && !p.baseUrl.includes('localhost') && p.code !== 'ollama') return false;

    // Search Query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const nameMatch = p.name.toLowerCase().includes(q);
      const urlMatch = p.baseUrl.toLowerCase().includes(q);
      const modelMatch = p.supportedModels.some((m) => m.toLowerCase().includes(q));
      return nameMatch || urlMatch || modelMatch;
    }

    return true;
  });
});

function getBrandStyle(code: string) {
  switch (code) {
    case 'zhipu':
      return { bgClass: 'bg-purple-50 border-purple-200', textClass: 'text-purple-600', icon: Sparkles };
    case 'openai':
      return { bgClass: 'bg-emerald-50 border-emerald-200', textClass: 'text-emerald-600', icon: Zap };
    case 'qwen':
      return { bgClass: 'bg-sky-50 border-sky-200', textClass: 'text-sky-600', icon: Globe };
    case 'ollama':
      return { bgClass: 'bg-amber-50 border-amber-200', textClass: 'text-amber-600', icon: HardDrive };
    default:
      return { bgClass: 'bg-indigo-50 border-indigo-200', textClass: 'text-indigo-600', icon: Server };
  }
}

function saveKey(id: string) {
  const val = keyInputs[id];
  if (val && val.trim()) {
    updateLlmProvider(id, { apiKeyConfigured: true });
    keyInputs[id] = '';
  } else {
    addToast({ type: 'warning', title: '提示', message: '请输入有效的新 API Key 凭证' });
  }
}

function promptAddModel(providerId: string) {
  const input = window.prompt('请输入需要追加绑定的 LLM 模型名称 (例如: deepseek-v3 / gpt-4.5-turbo):');
  if (input && input.trim()) {
    addModelToProvider(providerId, input.trim());
  }
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    addToast({ type: 'info', title: '已复制至剪贴板', message: text });
  }
}

function openAddModal() {
  newForm.name = '';
  newForm.code = '';
  newForm.baseUrl = 'https://api.openai.com/v1/';
  newForm.apiKey = '';
  newForm.defaultModel = '';
  newForm.modelsStr = '';
  showAddModal.value = true;
}

function submitNewProvider() {
  if (!newForm.name || !newForm.code || !newForm.baseUrl || !newForm.defaultModel) return;

  const modelsList = newForm.modelsStr
    ? newForm.modelsStr.split(',').map((s) => s.trim()).filter(Boolean)
    : [newForm.defaultModel];

  if (!modelsList.includes(newForm.defaultModel)) {
    modelsList.unshift(newForm.defaultModel);
  }

  addLlmProvider({
    name: newForm.name,
    code: newForm.code.toLowerCase(),
    baseUrl: newForm.baseUrl,
    apiKeyConfigured: !!newForm.apiKey,
    defaultModel: newForm.defaultModel,
    supportedModels: modelsList,
    isBuiltIn: false,
  });

  showAddModal.value = false;
}
</script>
