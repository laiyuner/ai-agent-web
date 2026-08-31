<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Cpu class="w-6 h-6 text-indigo-600" />
          <span>LLM 大模型供应商与网关配置</span>
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          统一管理与监控智谱开放平台 (BigModel)、DeepSeek API 及 OpenAI 官方协议接入基点与数据库密钥凭证
        </p>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
      <!-- Category Tabs (Segmented Tab Controls) -->
      <div class="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl w-full sm:w-auto">
        <button
          v-for="tab in filterTabs"
          :key="tab.id"
          @click="activeFilter = tab.id"
          class="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-none btn-tactile select-none"
          :class="activeFilter === tab.id ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'"
        >
          <span>{{ tab.label }}</span>
          <span
            class="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
            :class="activeFilter === tab.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-500'"
          >
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
        class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs flex flex-col justify-between space-y-5 min-w-0 card-elevated hover:border-indigo-200"
      >
        <!-- Card Top Section -->
        <div class="space-y-4 min-w-0 flex-1 flex flex-col">
          <!-- Card Header: Provider Icon, Name, Status, and Test Button -->
          <div class="flex items-start justify-between gap-3 min-w-0">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <!-- Brand Badge Icon -->
              <div
                class="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-2xs"
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
                  <!-- 密钥来源徽章：DATABASE 绿色「数据库密钥」/ NONE 灰色「未配置密钥」 -->
                  <span
                    class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0"
                    :class="
                      p.keySource === 'DATABASE' || (p.apiKeyConfigured && p.keySource !== 'NONE')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="p.keySource === 'DATABASE' || (p.apiKeyConfigured && p.keySource !== 'NONE') ? 'bg-emerald-500' : 'bg-slate-400'"
                    ></span>
                    {{ (p.keySource === 'DATABASE' || (p.apiKeyConfigured && p.keySource !== 'NONE')) ? '数据库密钥' : '未配置密钥' }}
                  </span>

                  <span class="text-[11px] text-slate-400 font-medium truncate font-mono">
                    {{ p.isBuiltIn ? '原生内置' : '自定义拓展' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Test Connection Button (带前置已配置校验) -->
            <button
              v-if="hasPermission('llm_provider:test')"
              @click="handleTestProvider(p)"
              title="测试 Endpoint 握手连通性与响应延时"
              class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-200/80 hover:border-indigo-300 transition-all flex items-center gap-1.5 group cursor-pointer shadow-2xs shrink-0 mt-0.5 btn-tactile"
            >
              <Activity class="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>测试</span>
            </button>
          </div>

          <!-- 未配置密钥行内小字提示 -->
          <div
            v-if="p.keySource === 'NONE' || (!p.apiKeyConfigured && p.keySource !== 'DATABASE')"
            class="flex items-start gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-500 text-[11px] leading-relaxed"
          >
            <AlertCircle class="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>未配置密钥的供应商无法执行节点，请点击编辑配置 API Key（密钥仅支持在此页面配置）</span>
          </div>

          <!-- Base URL Display & Edit Box -->
          <div class="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2.5 space-y-1.5 min-w-0">
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>API Base URL Endpoint</span>
              <div class="flex items-center gap-1">
                <span class="font-mono text-[10px] text-slate-400">REST / v1</span>
                <!-- 编辑 Base URL 切换按钮 -->
                <button
                  v-if="hasPermission('llm_provider:update')"
                  @click="toggleEditBaseUrl(p)"
                  class="ml-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 cursor-pointer"
                  :title="editingBaseUrlId === p.id ? '取消编辑' : '编辑 Base URL'"
                >
                  <Pencil class="w-3 h-3" />
                  <span>{{ editingBaseUrlId === p.id ? '取消' : '编辑' }}</span>
                </button>
              </div>
            </div>

            <!-- 展示状态 -->
            <div v-if="editingBaseUrlId !== p.id" class="flex items-center justify-between gap-2 min-w-0">
              <span
                class="font-mono text-xs text-slate-800 font-semibold truncate min-w-0 select-all"
                :title="p.baseUrl"
              >
                {{ p.baseUrl }}
              </span>

              <button
                @click="copyToClipboard(p.baseUrl)"
                class="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors shrink-0 cursor-pointer btn-tactile"
                title="复制 Base URL"
              >
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- 编辑状态 -->
            <div v-else class="space-y-1.5 pt-0.5">
              <div class="flex items-center gap-1.5">
                <input
                  v-model="baseUrlInputs[p.id]"
                  type="text"
                  placeholder="https://api.example.com/v1"
                  class="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  @click="saveBaseUrl(p)"
                  class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                >
                  保存
                </button>
              </div>
              <p
                v-if="p.keySource === 'NONE' || (!p.apiKeyConfigured && p.keySource !== 'DATABASE')"
                class="text-[10px] text-amber-600 flex items-center gap-1"
              >
                <AlertCircle class="w-3 h-3 shrink-0" />
                <span>该供应商尚未配置密钥，保存 Base URL 时请同时在下方填写 API Key</span>
              </p>
            </div>
          </div>

          <!-- Supported Models List Section (纯展示，由后端统一管理) -->
          <div class="space-y-2 min-w-0 mt-auto">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">支持模型 ({{ p.supportedModels.length }})</span>
              <span class="text-[10px] text-slate-400">模型目录由后端统一管理</span>
            </div>

            <div class="flex flex-wrap gap-1.5 min-w-0 max-h-32 overflow-y-auto pr-1">
              <div
                v-for="m in p.supportedModels"
                :key="m"
                class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-mono border min-w-0 max-w-[200px] select-none"
                :class="
                  m === p.defaultModel
                    ? 'bg-indigo-50 text-indigo-700 font-bold border-indigo-200 shadow-2xs'
                    : 'bg-slate-100/80 text-slate-600 border-slate-200/80'
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
            <span class="text-[11px] text-slate-400 font-mono">
              {{ (p.keySource === 'DATABASE' || p.apiKeyConfigured) ? '数据库密文存储中' : '暂无配置密钥' }}
            </span>
          </div>

          <div class="flex items-center gap-2 min-w-0">
            <div class="relative flex-1 min-w-0">
              <KeyRound class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                v-model="keyInputs[p.id]"
                :type="showKeys[p.id] ? 'text' : 'password'"
                :placeholder="(p.keySource === 'DATABASE' || p.apiKeyConfigured) ? '•••••••••••••••• (数据库密文存储中)' : 'sk-********************************'"
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
              v-if="hasPermission('llm_provider:update')"
              @click="saveKey(p.id)"
              class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shrink-0 shadow-2xs cursor-pointer btn-tactile"
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
        请联系管理员在 LLM 供应商管理页配置密钥
      </p>
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
  Copy,
  Star,
  Search,
  Sparkles,
  Zap,
  Server,
  AlertCircle,
  Pencil,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import type { LLMProvider } from '../../types';

const {
  state,
  updateLlmProvider,
  testLlmProvider,
  addToast,
  hasPermission,
} = useAppStore();

const searchQuery = ref('');
const activeFilter = ref<'all' | 'configured' | 'unconfigured'>('all');

const filterTabs = [
  { id: 'all' as const, label: '全部供应商' },
  { id: 'configured' as const, label: '数据库密钥 (已配置)' },
  { id: 'unconfigured' as const, label: '未配置密钥' },
];

const keyInputs = reactive<Record<string, string>>({});
const showKeys = reactive<Record<string, boolean>>({});

// Base URL 编辑状态与输入缓存
const editingBaseUrlId = ref<string | null>(null);
const baseUrlInputs = reactive<Record<string, string>>({});

function getCountByFilter(filterId: string) {
  if (filterId === 'all') return state.llmProviders.length;
  if (filterId === 'configured') return state.llmProviders.filter((p) => p.keySource === 'DATABASE' || p.status === 'configured').length;
  if (filterId === 'unconfigured') return state.llmProviders.filter((p) => p.keySource === 'NONE' || p.status !== 'configured').length;
  return 0;
}

const filteredProviders = computed(() => {
  return state.llmProviders.filter((p) => {
    const isConfigured = p.keySource === 'DATABASE' || p.status === 'configured';
    // Filter Tab
    if (activeFilter.value === 'configured' && !isConfigured) return false;
    if (activeFilter.value === 'unconfigured' && isConfigured) return false;

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
    case 'deepseek':
      return { bgClass: 'bg-blue-50 border-blue-200', textClass: 'text-blue-600', icon: Cpu };
    case 'openai':
      return { bgClass: 'bg-emerald-50 border-emerald-200', textClass: 'text-emerald-600', icon: Zap };
    default:
      return { bgClass: 'bg-indigo-50 border-indigo-200', textClass: 'text-indigo-600', icon: Server };
  }
}

function saveKey(id: string) {
  const val = keyInputs[id];
  if (val && val.trim()) {
    // 关键修复：必须把用户输入的明文 Key 传给后端（后端 AES 加密落库），
    // 之前传 apiKeyConfigured 布尔标志导致密钥从未真正保存
    updateLlmProvider(id, { apiKey: val.trim() });
    keyInputs[id] = '';
  } else {
    addToast({ type: 'warning', title: '提示', message: '请输入有效的新 API Key 凭证' });
  }
}

function toggleEditBaseUrl(p: LLMProvider) {
  if (editingBaseUrlId.value === p.id) {
    editingBaseUrlId.value = null;
  } else {
    editingBaseUrlId.value = p.id;
    baseUrlInputs[p.id] = p.baseUrl;
  }
}

function saveBaseUrl(p: LLMProvider) {
  const newUrl = baseUrlInputs[p.id]?.trim();
  if (!newUrl) {
    addToast({ type: 'warning', title: '提示', message: 'Base URL 不能为空' });
    return;
  }

  const updates: { baseUrl: string; apiKey?: string } = { baseUrl: newUrl };

  // 若数据库中无记录且未配置密钥，新建 upsert 要求必须带 apiKey
  const unconfigured = p.keySource === 'NONE' || (!p.apiKeyConfigured && p.keySource !== 'DATABASE');
  if (unconfigured) {
    const keyVal = keyInputs[p.id]?.trim();
    if (!keyVal) {
      addToast({
        type: 'warning',
        title: '需要填写 API Key',
        message: '该供应商尚未在数据库中配置，保存 Base URL 时请同时在下方输入 API Key',
      });
      return;
    }
    updates.apiKey = keyVal;
  }

  updateLlmProvider(p.id, updates);
  editingBaseUrlId.value = null;
}

function handleTestProvider(p: LLMProvider) {
  const isConfigured = p.keySource === 'DATABASE' || (p.apiKeyConfigured && p.keySource !== 'NONE');
  if (!isConfigured) {
    addToast({
      type: 'warning',
      title: '未配置密钥',
      message: '请先配置 API Key 再测试连通性',
    });
    return;
  }
  testLlmProvider(p.id);
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    addToast({ type: 'info', title: '已复制至剪贴板', message: text });
  }
}
</script>
