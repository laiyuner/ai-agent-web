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
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- 1. 推理架构类型自定义下拉 -->
                <div class="relative custom-dropdown-container" ref="typeDropdownRef">
                  <label class="block font-semibold text-slate-700 mb-1">推理架构类型</label>
                  <button
                    type="button"
                    @click.stop="toggleDropdown('type')"
                    class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <div
                        class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs"
                        :class="form.type === 'ReAct' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'"
                      >
                        <Workflow v-if="form.type === 'ReAct'" class="w-3.5 h-3.5" />
                        <Code2 v-else class="w-3.5 h-3.5" />
                      </div>
                      <span class="font-semibold text-slate-800 truncate">
                        {{ form.type === 'ReAct' ? 'ReAct (思考循环)' : 'Function Calling' }}
                      </span>
                    </div>
                    <ChevronDown
                      class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200"
                      :class="{ 'rotate-180 text-indigo-600': openDropdown === 'type' }"
                    />
                  </button>

                  <!-- Type Popover Menu -->
                  <Transition name="dropdown-pop">
                    <div
                      v-if="openDropdown === 'type'"
                      class="absolute top-full left-0 mt-1.5 w-72 z-30 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 space-y-1.5 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
                      @click.stop
                    >
                      <div class="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        选择推理模式
                      </div>
                      
                      <!-- Option: ReAct -->
                      <div
                        @click="selectType('ReAct')"
                        class="p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5"
                        :class="form.type === 'ReAct' ? 'bg-indigo-50/80 border-indigo-200/90 text-indigo-950' : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'"
                      >
                        <div class="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Workflow class="w-4 h-4" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-xs">ReAct 思考循环</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">推荐</span>
                          </div>
                          <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            Reasoning + Acting 自主规划与多步工具循环调用
                          </p>
                        </div>
                        <Check v-if="form.type === 'ReAct'" class="w-4 h-4 text-indigo-600 shrink-0 mt-1" />
                      </div>

                      <!-- Option: Functions -->
                      <div
                        @click="selectType('Functions')"
                        class="p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5"
                        :class="form.type === 'Functions' ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950' : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'"
                      >
                        <div class="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Code2 class="w-4 h-4" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-xs">Function Calling</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">低延迟</span>
                          </div>
                          <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            原生函数回调，精准提取结构化参数
                          </p>
                        </div>
                        <Check v-if="form.type === 'Functions'" class="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- 2. LLM 供应商自定义下拉 -->
                <div class="relative custom-dropdown-container" ref="providerDropdownRef">
                  <label class="block font-semibold text-slate-700 mb-1">LLM 供应商</label>
                  <button
                    type="button"
                    @click.stop="toggleDropdown('provider')"
                    class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <div
                        class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono border"
                        :class="getProviderStyle(form.llmProviderId).bg"
                      >
                        {{ getProviderStyle(form.llmProviderId).badge }}
                      </div>
                      <span class="font-semibold text-slate-800 truncate">
                        {{ currentProviderName }}
                      </span>
                    </div>
                    <ChevronDown
                      class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200"
                      :class="{ 'rotate-180 text-indigo-600': openDropdown === 'provider' }"
                    />
                  </button>

                  <!-- Provider Popover Menu -->
                  <Transition name="dropdown-pop">
                    <div
                      v-if="openDropdown === 'provider'"
                      class="absolute top-full right-0 sm:left-0 mt-1.5 w-80 z-30 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 space-y-1 text-xs select-none max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                      @click.stop
                    >
                      <div class="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>可用 LLM 供应商</span>
                        <span class="font-mono">{{ availableProviders.length }} 个可用</span>
                      </div>

                      <!-- Provider List -->
                      <div
                        v-for="p in availableProviders"
                        :key="p.id"
                        @click="selectProvider(p)"
                        class="p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5"
                        :class="form.llmProviderId === p.id ? 'bg-indigo-50/80 border-indigo-200/90 text-indigo-950' : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'"
                      >
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div
                            class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono border"
                            :class="getProviderStyle(p.id).bg"
                          >
                            {{ getProviderStyle(p.id).badge }}
                          </div>
                          <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                              <span class="font-bold text-xs text-slate-900 truncate">{{ p.name }}</span>
                              <span
                                class="text-[9px] px-1 py-0.2 rounded font-mono"
                                :class="p.apiKeyConfigured ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80' : 'bg-amber-50 text-amber-600 border border-amber-200/80'"
                              >
                                {{ p.apiKeyConfigured ? '就绪' : '未配Key' }}
                              </span>
                            </div>
                            <div class="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                              {{ p.supportedModels.length }} 个模型 • {{ p.code }}
                            </div>
                          </div>
                        </div>
                        <Check v-if="form.llmProviderId === p.id" class="w-4 h-4 text-indigo-600 shrink-0" />
                      </div>

                      <!-- Empty State if no providers -->
                      <div v-if="availableProviders.length === 0" class="p-4 text-center space-y-2">
                        <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                          <Cpu class="w-4 h-4" />
                        </div>
                        <p class="text-xs text-slate-500 font-medium">暂无已启用的供应商</p>
                        <p class="text-[10px] text-slate-400">请前往「LLM 供应商」页面配置 API Key</p>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>

              <!-- 3. 基座模型版本自定义下拉（带搜索与自定义输入） -->
              <div class="relative custom-dropdown-container" ref="modelDropdownRef">
                <div class="flex items-center justify-between mb-1">
                  <label class="block font-semibold text-slate-700">基座模型版本</label>
                  <span class="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                    {{ currentSupportedModels.length }} 个可选预设
                  </span>
                </div>

                <button
                  type="button"
                  @click.stop="toggleDropdown('model')"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs"
                >
                  <div class="flex items-center gap-2 truncate">
                    <div class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Sparkles class="w-3.5 h-3.5" />
                    </div>
                    <span class="font-mono font-bold text-slate-900 text-xs truncate">
                      {{ form.model || '请选择或输入基座模型' }}
                    </span>
                    <span
                      v-if="getModelBadge(form.model)"
                      class="text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 hidden sm:inline-flex"
                      :class="getModelBadge(form.model).color"
                    >
                      {{ getModelBadge(form.model).label }}
                    </span>
                  </div>
                  <ChevronDown
                    class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200"
                    :class="{ 'rotate-180 text-indigo-600': openDropdown === 'model' }"
                  />
                </button>

                <!-- Model Popover Menu with Search & Custom Support -->
                <Transition name="dropdown-pop">
                  <div
                    v-if="openDropdown === 'model'"
                    class="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2.5 space-y-2 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
                    @click.stop
                  >
                    <!-- Search / Custom Input -->
                    <div class="relative">
                      <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        v-model="modelSearchQuery"
                        type="text"
                        placeholder="搜索或手动键入模型名称 (如 deepseek-chat, gpt-4o)..."
                        class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        @keydown.enter.prevent="applyCustomModel"
                      />
                    </div>

                    <!-- Scrollable Model List -->
                    <div class="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                      <!-- Model Preset Items -->
                      <div
                        v-for="m in filteredSupportedModels"
                        :key="m"
                        @click="selectModel(m)"
                        class="p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2"
                        :class="form.model === m ? 'bg-indigo-50/80 border-indigo-200/90 text-indigo-950' : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'"
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="w-2 h-2 rounded-full shrink-0" :class="form.model === m ? 'bg-indigo-600' : 'bg-slate-300'" />
                          <span class="font-mono font-bold text-xs text-slate-800 truncate">{{ m }}</span>
                          <span
                            v-if="getModelBadge(m)"
                            class="text-[9px] px-1.5 py-0.2 rounded-full font-medium border shrink-0"
                            :class="getModelBadge(m).color"
                          >
                            {{ getModelBadge(m).label }}
                          </span>
                        </div>
                        <Check v-if="form.model === m" class="w-4 h-4 text-indigo-600 shrink-0" />
                      </div>

                      <!-- Option to use typed custom model -->
                      <div
                        v-if="modelSearchQuery.trim() && !filteredSupportedModels.includes(modelSearchQuery.trim())"
                        @click="applyCustomModel"
                        class="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-900 flex items-center justify-between cursor-pointer transition-all mt-1"
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          <Plus class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span class="text-xs truncate">
                            使用自定义模型：<strong class="font-mono text-indigo-700">{{ modelSearchQuery.trim() }}</strong>
                          </span>
                        </div>
                        <span class="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold shrink-0">应用</span>
                      </div>

                      <!-- Empty State when provider has no preset models -->
                      <div
                        v-if="filteredSupportedModels.length === 0 && !modelSearchQuery.trim()"
                        class="p-4 text-center space-y-2 bg-slate-50/50 rounded-xl border border-slate-100"
                      >
                        <div class="w-7 h-7 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                          <Sparkles class="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p class="text-xs font-semibold text-slate-700">暂无预设模型</p>
                          <p class="text-[10px] text-slate-400 mt-0.5">请在上方搜索框直接键入模型名称并回车确认</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>

              <!-- Section 3: System Prompt -->
              <div class="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>System Prompt 角色指令</span>
                    <span class="text-rose-500">*</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">{{ form.systemPrompt.length }} 字符</span>
                </div>
                <textarea
                  v-model="form.systemPrompt"
                  rows="6"
                  placeholder="你是一名资深架构师... 请严格输出 JSON 格式。"
                  class="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all placeholder:text-slate-400"
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  Bot,
  X,
  ChevronDown,
  Check,
  Search,
  Sparkles,
  Cpu,
  Workflow,
  Code2,
  Plus,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { Agent, AgentType, AgentMcpBinding } from '../../types';

const { state, addAgent, updateAgent, hasPermission } = useAppStore();

const isEdit = computed(() => !!state.editingAgent);

// Dropdown states
const openDropdown = ref<'type' | 'provider' | 'model' | null>(null);
const modelSearchQuery = ref('');
const typeDropdownRef = ref<HTMLElement | null>(null);
const providerDropdownRef = ref<HTMLElement | null>(null);
const modelDropdownRef = ref<HTMLElement | null>(null);

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

/** 内置默认供应商兜底（防止异步加载或空数据时异常） */
const DEFAULT_FALLBACK_PROVIDERS = [
  {
    id: 'zhipu',
    name: '智谱开放平台 (BigModel)',
    code: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyConfigured: true,
    defaultModel: 'glm-4-flash',
    supportedModels: ['glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-4-0520'],
    status: 'configured' as const,
    isBuiltIn: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API 网关',
    code: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyConfigured: true,
    defaultModel: 'deepseek-chat',
    supportedModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
    status: 'configured' as const,
    isBuiltIn: true,
  },
  {
    id: 'openai',
    name: 'OpenAI 官方 API',
    code: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyConfigured: true,
    defaultModel: 'gpt-4o',
    supportedModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1-preview'],
    status: 'configured' as const,
    isBuiltIn: true,
  },
  {
    id: 'qwen',
    name: '阿里云通义千问 Qwen',
    code: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyConfigured: true,
    defaultModel: 'qwen-max',
    supportedModels: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen2.5-72b-instruct'],
    status: 'configured' as const,
    isBuiltIn: true,
  },
  {
    id: 'ollama',
    name: 'Ollama 本地部署',
    code: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyConfigured: false,
    defaultModel: 'llama3.2',
    supportedModels: ['llama3.2', 'qwen2.5-coder', 'deepseek-r1:7b'],
    status: 'unconfigured' as const,
    isBuiltIn: true,
  },
];

/** 可用供应商列表 */
const availableProviders = computed(() => {
  if (state.llmProviders && state.llmProviders.length > 0) {
    return state.llmProviders;
  }
  return DEFAULT_FALLBACK_PROVIDERS;
});

/** 当前选择的供应商名称 */
const currentProviderName = computed(() => {
  const p = availableProviders.value.find((x) => x.id === form.value.llmProviderId);
  return p ? p.name : form.value.llmProviderName || '智谱 BigModel';
});

/** 当前供应商所支持的模型列表 */
const currentSupportedModels = computed(() => {
  const p = availableProviders.value.find((x) => x.id === form.value.llmProviderId);
  if (p && p.supportedModels && p.supportedModels.length > 0) {
    return p.supportedModels;
  }
  return ['glm-4-flash', 'glm-4-plus'];
});

/** 过滤后的模型列表 */
const filteredSupportedModels = computed(() => {
  const list = currentSupportedModels.value || [];
  if (!modelSearchQuery.value.trim()) return list;
  const q = modelSearchQuery.value.toLowerCase().trim();
  return list.filter((m) => m.toLowerCase().includes(q));
});

/** 切换下拉菜单开合 */
function toggleDropdown(type: 'type' | 'provider' | 'model') {
  if (openDropdown.value === type) {
    openDropdown.value = null;
  } else {
    openDropdown.value = type;
    if (type === 'model') {
      modelSearchQuery.value = '';
    }
  }
}

/** 选择架构类型 */
function selectType(t: AgentType) {
  form.value.type = t;
  openDropdown.value = null;
}

/** 选择供应商 */
function selectProvider(p: any) {
  form.value.llmProviderId = p.id;
  form.value.llmProviderName = p.name;
  if (p.defaultModel) {
    form.value.model = p.defaultModel;
  } else if (p.supportedModels && p.supportedModels.length > 0) {
    form.value.model = p.supportedModels[0];
  }
  openDropdown.value = null;
}

/** 选择模型 */
function selectModel(m: string) {
  form.value.model = m;
  openDropdown.value = null;
}

/** 应用自定义输入的模型 */
function applyCustomModel() {
  const custom = modelSearchQuery.value.trim();
  if (custom) {
    form.value.model = custom;
  }
  openDropdown.value = null;
}

/** 模型特征徽章 */
function getModelBadge(modelName: string): { label: string; color: string } | null {
  if (!modelName) return null;
  const lower = modelName.toLowerCase();
  if (lower.includes('flash') || lower.includes('mini') || lower.includes('turbo')) {
    return { label: '⚡ 极速响应', color: 'bg-amber-50 text-amber-700 border-amber-200/80' };
  }
  if (lower.includes('reasoner') || lower.includes('r1') || lower.includes('o1') || lower.includes('o3')) {
    return { label: '🧠 深度思考', color: 'bg-purple-50 text-purple-700 border-purple-200/80' };
  }
  if (lower.includes('coder') || lower.includes('code')) {
    return { label: '💻 代码专精', color: 'bg-blue-50 text-blue-700 border-blue-200/80' };
  }
  if (lower.includes('plus') || lower.includes('max') || lower.includes('4o') || lower.includes('pro')) {
    return { label: '💎 旗舰通用', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' };
  }
  return { label: '通用基座', color: 'bg-slate-50 text-slate-600 border-slate-200/80' };
}

/** 供应商徽标与样式 */
function getProviderStyle(idOrCode: string): { bg: string; badge: string } {
  const code = (idOrCode || '').toLowerCase();
  if (code.includes('zhipu') || code.includes('glm')) {
    return { bg: 'bg-blue-50 text-blue-600 border-blue-200/80', badge: '智' };
  }
  if (code.includes('deepseek')) {
    return { bg: 'bg-cyan-50 text-cyan-600 border-cyan-200/80', badge: 'DS' };
  }
  if (code.includes('openai') || code.includes('gpt')) {
    return { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80', badge: 'OA' };
  }
  if (code.includes('qwen') || code.includes('ali')) {
    return { bg: 'bg-orange-50 text-orange-600 border-orange-200/80', badge: '千' };
  }
  if (code.includes('ollama')) {
    return { bg: 'bg-slate-100 text-slate-700 border-slate-300/80', badge: 'OL' };
  }
  return { bg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80', badge: 'AI' };
}

/** 全局点击外部自动收起下拉 */
function handleDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.custom-dropdown-container')) {
    openDropdown.value = null;
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});

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

function closeDrawer() {
  openDropdown.value = null;
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
