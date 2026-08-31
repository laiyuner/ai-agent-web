<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Cpu class="w-6 h-6 text-indigo-600" />
          <span>LLM 大模型供应商与网关配置</span>
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          统一管理智谱 (BigModel)、DeepSeek、OpenAI 及自定义第三方/本地大模型接入基点与数据库密钥凭证
        </p>
      </div>

      <!-- Add Provider Button -->
      <div v-if="hasPermission('llm_provider:update')" class="flex items-center gap-3">
        <button
          @click="openAddModal"
          class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center gap-2 cursor-pointer btn-tactile"
        >
          <Plus class="w-4 h-4" />
          <span>添加供应商</span>
        </button>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
      <!-- Category Tabs -->
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
          placeholder="搜索供应商名称、标识、Base URL 或模型..."
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
          <!-- Card Header: Provider Icon, Name, Key Status, and Actions -->
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

                  <span class="text-[11px] text-slate-400 font-mono font-medium truncate">
                    {{ p.code || p.id }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="flex items-center gap-1.5 shrink-0 mt-0.5">
              <!-- Test Connection Button -->
              <button
                v-if="hasPermission('llm_provider:test')"
                @click="handleTestProvider(p)"
                title="测试 Endpoint 握手连通性与响应延时"
                class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-200/80 hover:border-indigo-300 transition-all flex items-center gap-1 group cursor-pointer shadow-2xs btn-tactile"
              >
                <Activity class="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>测试</span>
              </button>

              <!-- Edit Provider Button -->
              <button
                v-if="hasPermission('llm_provider:update')"
                @click="openEditModal(p)"
                title="编辑供应商配置"
                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors cursor-pointer btn-tactile"
              >
                <Pencil class="w-3.5 h-3.5" />
              </button>

              <!-- Delete Provider Button -->
              <button
                v-if="hasPermission('llm_provider:update')"
                @click="confirmDeleteProvider(p)"
                title="删除供应商"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer btn-tactile"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- 未配置密钥行内小字提示 -->
          <div
            v-if="p.keySource === 'NONE' || (!p.apiKeyConfigured && p.keySource !== 'DATABASE')"
            class="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-800 text-[11px] leading-relaxed"
          >
            <AlertCircle class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>未配置密钥的供应商无法执行节点，请点击右上角编辑按钮或在下方配置 API Key</span>
          </div>

          <!-- Base URL Display & Quick Edit Box -->
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
                  :title="editingBaseUrlId === p.id ? '取消快捷修改' : '快捷修改 Base URL'"
                >
                  <Pencil class="w-3 h-3" />
                  <span>{{ editingBaseUrlId === p.id ? '取消' : '修改' }}</span>
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

            <!-- 快捷编辑状态 -->
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
            </div>
          </div>

          <!-- Supported Models List Section -->
          <div class="space-y-2 min-w-0 mt-auto">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                支持模型 ({{ p.supportedModels ? p.supportedModels.length : 0 }})
              </span>
              <span class="text-[10px] text-slate-400 font-mono">
                默认: {{ p.defaultModel || '未设置' }}
              </span>
            </div>

            <div class="flex flex-wrap gap-1.5 min-w-0 max-h-32 overflow-y-auto pr-1">
              <div
                v-for="m in (p.supportedModels || [])"
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
              <div
                v-if="!p.supportedModels || p.supportedModels.length === 0"
                class="text-[11px] text-slate-400 italic"
              >
                未配置模型列表
              </div>
            </div>
          </div>
        </div>

        <!-- Card Bottom Section: Quick API Key Configuration Form -->
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
    <div v-else class="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
        <Cpu class="w-6 h-6" />
      </div>
      <div class="space-y-1 max-w-sm mx-auto">
        <h3 class="text-base font-bold text-slate-800">
          {{ state.llmProviders.length === 0 ? '暂无 LLM 供应商配置，点击右上角添加' : '未找到匹配的 LLM 供应商' }}
        </h3>
        <p class="text-xs text-slate-500">
          {{ state.llmProviders.length === 0 ? '支持接入千问、混元、DeepSeek、OpenAI 及各类兼容 OpenAI 协议的本地与云端模型' : '请尝试调整筛选标签或搜索关键词' }}
        </p>
      </div>
      <div v-if="hasPermission('llm_provider:update')">
        <button
          @click="openAddModal"
          class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer btn-tactile"
        >
          <Plus class="w-4 h-4" />
          <span>添加第一个供应商</span>
        </button>
      </div>
    </div>

    <!-- Add / Edit Provider Modal Dialog -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Cpu class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">
                {{ modalMode === 'create' ? '添加 LLM 供应商' : '编辑 LLM 供应商配置' }}
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                配置将以高强度 AES 加密并直接持久化至数据库
              </p>
            </div>
          </div>
          <button
            @click="closeModal"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Form Content -->
        <form @submit.prevent="handleModalSubmit" class="space-y-4">
          <!-- 1. 供应商标识 (provider) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-800">
                供应商唯一标识 (provider) <span class="text-rose-500">*</span>
              </label>
              <span class="text-[10px] text-slate-400 font-mono">限小写字母、数字、中划线</span>
            </div>
            <input
              v-model="modalForm.provider"
              type="text"
              :disabled="modalMode === 'edit'"
              placeholder="如 qwen / hunyuan / ollama / deepseek"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              :class="modalMode === 'edit' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'"
            />
            <p v-if="providerFormatError" class="text-[11px] text-rose-500">
              标识格式不正确：仅支持小写字母、数字与中划线 (如 qwen, hunyuan, ollama)
            </p>
          </div>

          <!-- 2. 显示名称 (displayName) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-800">
              显示名称 (displayName) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="modalForm.displayName"
              type="text"
              placeholder="如 阿里千问（百炼）、腾讯混元、Ollama 本地大模型"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all"
            />
          </div>

          <!-- 3. Base URL (baseUrl) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-800">
                Base URL (baseUrl) <span class="text-rose-500">*</span>
              </label>
              <span class="text-[10px] text-slate-400 font-mono">OpenAI 兼容协议地址</span>
            </div>
            <input
              v-model="modalForm.baseUrl"
              type="text"
              placeholder="https://api.example.com/v1"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all"
            />
            <!-- Quick Preset Chips -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span class="text-[10px] text-slate-400">常用预设：</span>
              <button
                type="button"
                v-for="preset in urlPresets"
                :key="preset.label"
                @click="applyUrlPreset(preset)"
                class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/80 transition-colors cursor-pointer select-none"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <!-- 4. API Key (apiKey) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-800">
                API Key (apiKey)
                <span v-if="modalMode === 'create'" class="text-rose-500">*</span>
                <span v-else class="text-slate-400 font-normal text-[11px]">（选填，留空保持原密钥不变）</span>
              </label>
              <span class="text-[10px] text-slate-400">数据库高强度加密</span>
            </div>
            <div class="relative">
              <KeyRound class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                v-model="modalForm.apiKey"
                :type="modalShowKey ? 'text' : 'password'"
                :placeholder="modalMode === 'create' ? 'sk-... (Ollama 等本地免 Key 服务填占位符 ollama)' : '•••••••• (留空表示不修改已有密钥)'"
                class="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all"
              />
              <button
                type="button"
                @click="modalShowKey = !modalShowKey"
                class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                :title="modalShowKey ? '隐藏密文' : '显示明文'"
              >
                <EyeOff v-if="modalShowKey" class="w-3.5 h-3.5" />
                <Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- 5. 模型列表 (supportedModels) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-800">
                模型列表 (supportedModels) <span class="text-rose-500">*</span>
              </label>
              <span class="text-[10px] text-slate-400">逗号或换行分隔</span>
            </div>
            <textarea
              v-model="modalForm.modelsInput"
              rows="2"
              placeholder="如 qwen-max, qwen-plus, qwen-turbo 或 deepseek-chat, deepseek-reasoner"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all"
            ></textarea>

            <!-- Parsed Models Preview Chips -->
            <div v-if="parsedModelsList.length > 0" class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
              <span
                v-for="m in parsedModelsList"
                :key="m"
                @click="modalForm.defaultModel = m"
                class="text-[10px] font-mono px-2 py-0.5 rounded-md border cursor-pointer select-none transition-colors"
                :class="
                  modalForm.defaultModel === m
                    ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 hover:border-indigo-300'
                "
                :title="'点击设为默认模型: ' + m"
              >
                <Star v-if="modalForm.defaultModel === m" class="w-2.5 h-2.5 inline-block mr-0.5 fill-current" />
                {{ m }}
              </span>
            </div>
          </div>

          <!-- 6. 默认模型 (defaultModel) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-800">
              默认模型 (defaultModel) <span class="text-rose-500">*</span>
            </label>
            <div v-if="parsedModelsList.length > 0">
              <select
                v-model="modalForm.defaultModel"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all cursor-pointer"
              >
                <option v-for="m in parsedModelsList" :key="m" :value="m">
                  {{ m }}
                </option>
              </select>
            </div>
            <div v-else>
              <input
                v-model="modalForm.defaultModel"
                type="text"
                placeholder="请输入默认模型名称"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all"
              />
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer btn-tactile disabled:opacity-60"
            >
              <span v-if="isSubmitting">保存中...</span>
              <span v-else>{{ modalMode === 'create' ? '创建供应商' : '保存修改' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal Dialog -->
    <div
      v-if="providerToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      @click.self="providerToDelete = null"
    >
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
            <Trash2 class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">确认删除 LLM 供应商</h3>
            <p class="text-xs text-slate-500 mt-0.5">该操作直接作用于数据库记录</p>
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs leading-relaxed text-slate-700">
          <p>
            删除后该供应商将从列表消失（Agent 无法再绑定它）。确定删除 <strong class="text-slate-900">{{ providerToDelete.name || providerToDelete.code }}</strong> 吗？
          </p>
          <p
            v-if="providerToDelete.keySource === 'DATABASE' || providerToDelete.apiKeyConfigured"
            class="text-rose-600 font-medium flex items-center gap-1"
          >
            <AlertCircle class="w-3.5 h-3.5 shrink-0" />
            <span>已配置的密钥将一并清除。</span>
          </p>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="providerToDelete = null"
            class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleDeleteProvider"
            :disabled="isDeleting"
            class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer btn-tactile disabled:opacity-60"
          >
            <span v-if="isDeleting">删除中...</span>
            <span v-else>确认删除</span>
          </button>
        </div>
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
  Copy,
  Star,
  Search,
  Sparkles,
  Zap,
  Server,
  AlertCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import type { LLMProvider } from '../../types';

const {
  state,
  updateLlmProvider,
  deleteLlmProvider,
  testLlmProvider,
  fetchLlmProviders,
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

// Base URL 快捷编辑状态与输入缓存
const editingBaseUrlId = ref<string | null>(null);
const baseUrlInputs = reactive<Record<string, string>>({});

// Modal State
const isModalOpen = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const modalShowKey = ref(false);
const isSubmitting = ref(false);

const modalForm = reactive({
  provider: '',
  displayName: '',
  baseUrl: '',
  apiKey: '',
  modelsInput: '',
  defaultModel: '',
});

// Delete Modal State
const providerToDelete = ref<LLMProvider | null>(null);
const isDeleting = ref(false);

const urlPresets = [
  { label: '阿里千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-max', models: 'qwen-max, qwen-plus, qwen-turbo' },
  { label: '腾讯混元', url: 'https://api.hunyuan.cloud.tencent.com/v1', defaultModel: 'hunyuan-pro', models: 'hunyuan-pro, hunyuan-standard, hunyuan-lite' },
  { label: 'Ollama 本地', url: 'http://localhost:11434/v1', defaultModel: 'llama3:latest', models: 'llama3:latest, qwen2.5:latest, mistral:latest' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', models: 'deepseek-chat, deepseek-reasoner' },
  { label: 'OpenAI', url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o', models: 'gpt-4o, gpt-4o-mini, o1-preview' },
  { label: '智谱开放平台', url: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4-flash', models: 'glm-4-flash, glm-4-plus, glm-4-air' },
];

function applyUrlPreset(preset: typeof urlPresets[0]) {
  modalForm.baseUrl = preset.url;
  if (!modalForm.modelsInput) {
    modalForm.modelsInput = preset.models;
  }
  if (!modalForm.defaultModel) {
    modalForm.defaultModel = preset.defaultModel;
  }
}

const parsedModelsList = computed(() => {
  if (!modalForm.modelsInput) return [];
  return modalForm.modelsInput
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
});

const providerFormatError = computed(() => {
  if (!modalForm.provider.trim()) return false;
  return !/^[a-z0-9-]+$/.test(modalForm.provider.trim());
});

function getCountByFilter(filterId: string) {
  if (filterId === 'all') return state.llmProviders.length;
  if (filterId === 'configured') return state.llmProviders.filter((p) => p.keySource === 'DATABASE' || (p.apiKeyConfigured && p.keySource !== 'NONE')).length;
  if (filterId === 'unconfigured') return state.llmProviders.filter((p) => p.keySource === 'NONE' || (!p.apiKeyConfigured && p.keySource !== 'DATABASE')).length;
  return 0;
}

const filteredProviders = computed(() => {
  return state.llmProviders.filter((p) => {
    const isConfigured = p.keySource === 'DATABASE' || (p.apiKeyConfigured && p.keySource !== 'NONE');
    // Filter Tab
    if (activeFilter.value === 'configured' && !isConfigured) return false;
    if (activeFilter.value === 'unconfigured' && isConfigured) return false;

    // Search Query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const codeMatch = (p.code || p.id || '').toLowerCase().includes(q);
      const urlMatch = (p.baseUrl || '').toLowerCase().includes(q);
      const modelMatch = (p.supportedModels || []).some((m) => m.toLowerCase().includes(q));
      return nameMatch || codeMatch || urlMatch || modelMatch;
    }

    return true;
  });
});

function getBrandStyle(code: string) {
  const c = (code || '').toLowerCase();
  if (c.includes('zhipu') || c.includes('glm')) {
    return { bgClass: 'bg-purple-50 border-purple-200', textClass: 'text-purple-600', icon: Sparkles };
  }
  if (c.includes('deepseek')) {
    return { bgClass: 'bg-blue-50 border-blue-200', textClass: 'text-blue-600', icon: Cpu };
  }
  if (c.includes('openai') || c.includes('gpt')) {
    return { bgClass: 'bg-emerald-50 border-emerald-200', textClass: 'text-emerald-600', icon: Zap };
  }
  if (c.includes('qwen') || c.includes('ali')) {
    return { bgClass: 'bg-orange-50 border-orange-200', textClass: 'text-orange-600', icon: Sparkles };
  }
  if (c.includes('hunyuan') || c.includes('tencent')) {
    return { bgClass: 'bg-cyan-50 border-cyan-200', textClass: 'text-cyan-600', icon: Cpu };
  }
  return { bgClass: 'bg-indigo-50 border-indigo-200', textClass: 'text-indigo-600', icon: Server };
}

function openAddModal() {
  modalMode.value = 'create';
  modalForm.provider = '';
  modalForm.displayName = '';
  modalForm.baseUrl = '';
  modalForm.apiKey = '';
  modalForm.modelsInput = '';
  modalForm.defaultModel = '';
  modalShowKey.value = false;
  isModalOpen.value = true;
}

function openEditModal(p: LLMProvider) {
  modalMode.value = 'edit';
  modalForm.provider = p.code || p.id;
  modalForm.displayName = p.name || '';
  modalForm.baseUrl = p.baseUrl || '';
  modalForm.apiKey = ''; // 留空表示不更新原有密钥
  modalForm.modelsInput = (p.supportedModels || []).join(', ');
  modalForm.defaultModel = p.defaultModel || (p.supportedModels && p.supportedModels[0]) || '';
  modalShowKey.value = false;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

async function handleModalSubmit() {
  const provider = modalForm.provider.trim();
  if (!provider) {
    addToast({ type: 'warning', title: '校验提示', message: '供应商标识 (provider) 不能为空' });
    return;
  }
  if (!/^[a-z0-9-]+$/.test(provider)) {
    addToast({ type: 'warning', title: '校验提示', message: '供应商标识仅支持小写字母、数字与中划线' });
    return;
  }
  if (!modalForm.displayName.trim()) {
    addToast({ type: 'warning', title: '校验提示', message: '显示名称 (displayName) 不能为空' });
    return;
  }
  if (!modalForm.baseUrl.trim()) {
    addToast({ type: 'warning', title: '校验提示', message: 'Base URL (baseUrl) 不能为空' });
    return;
  }

  const models = parsedModelsList.value;
  if (models.length === 0) {
    addToast({ type: 'warning', title: '校验提示', message: '模型列表 (supportedModels) 至少需填写一个模型' });
    return;
  }

  const defaultModel = modalForm.defaultModel.trim() || models[0];

  if (modalMode.value === 'create' && !modalForm.apiKey.trim()) {
    addToast({
      type: 'warning',
      title: '校验提示',
      message: '新建供应商时 API Key 为必填项（Ollama 等本地免密服务可填 ollama）',
    });
    return;
  }

  const reqData: Record<string, any> = {
    displayName: modalForm.displayName.trim(),
    baseUrl: modalForm.baseUrl.trim(),
    supportedModels: models,
    defaultModel: defaultModel,
  };

  if (modalForm.apiKey.trim()) {
    reqData.apiKey = modalForm.apiKey.trim();
  }

  try {
    isSubmitting.value = true;
    await updateLlmProvider(provider, reqData);
    await fetchLlmProviders();
    closeModal();
  } catch (err) {
    // Toast handled in updateLlmProvider
  } finally {
    isSubmitting.value = false;
  }
}

function confirmDeleteProvider(p: LLMProvider) {
  providerToDelete.value = p;
}

async function handleDeleteProvider() {
  if (!providerToDelete.value) return;
  const pCode = providerToDelete.value.code || providerToDelete.value.id;
  try {
    isDeleting.value = true;
    const success = await deleteLlmProvider(pCode);
    if (success) {
      providerToDelete.value = null;
    }
  } finally {
    isDeleting.value = false;
  }
}

function saveKey(id: string) {
  const val = keyInputs[id];
  if (val && val.trim()) {
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

async function saveBaseUrl(p: LLMProvider) {
  const newUrl = baseUrlInputs[p.id]?.trim();
  if (!newUrl) {
    addToast({ type: 'warning', title: '提示', message: 'Base URL 不能为空' });
    return;
  }

  const updates: { baseUrl: string; apiKey?: string } = { baseUrl: newUrl };
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

  await updateLlmProvider(p.code || p.id, updates);
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
  testLlmProvider(p.code || p.id);
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    addToast({ type: 'info', title: '已复制至剪贴板', message: text });
  }
}
</script>

