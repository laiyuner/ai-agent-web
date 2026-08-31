<template>
  <div v-if="!currentRun && isFetchingRun" class="p-6 lg:p-8 w-full">
    <div class="py-16 px-6 bg-white border border-slate-200/90 rounded-3xl text-center space-y-4 animate-pulse">
      <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
        <Activity class="w-6 h-6 animate-spin" />
      </div>
      <div class="space-y-1">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">正在拉取调度审计详情...</h3>
        <p class="text-xs text-slate-400">同步服务端运行单据与链路分片事件</p>
      </div>
    </div>
  </div>

  <div v-else-if="!currentRun && !isFetchingRun" class="p-6 lg:p-8 w-full">
    <div class="py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <Activity class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">暂无执行单据</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">未检索到正在执行或历史运行单据，可前往工作流列表发起调度。</p>
      </div>
      <button
        @click="setRoute('workflows')"
        class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
      >
        <GitFork class="w-3.5 h-3.5" />
        <span>前往工作流列表</span>
      </button>
    </div>
  </div>

  <div v-else class="p-6 lg:p-8 w-full space-y-6">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
      <div class="space-y-1.5">
        <div class="flex items-center gap-3 flex-wrap">
          <button
            @click="setRoute('runs')"
            class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="返回执行历史"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>

          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity class="w-6 h-6 text-indigo-600 animate-pulse" />
            <span>执行监控</span>
          </h2>

          <!-- Status Indicator Pill -->
          <span
            class="text-xs px-3 py-1 rounded-full font-bold"
            :class="statusClass(currentRun.status)"
          >
            {{ statusText(currentRun.status) }}
          </span>

          <!-- WebSocket Connection Status Pill -->
          <span
            class="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-all"
            :class="{
              'bg-emerald-50 text-emerald-700 border border-emerald-200': wsStatus === '已连接',
              'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse': wsStatus === '连接中...' || wsStatus === '重连中...',
              'bg-slate-100 text-slate-500 border border-slate-200': wsStatus === '已结束' || wsStatus === '已断开' || wsStatus === '已完成',
              'bg-rose-50 text-rose-700 border border-rose-200': wsStatus === '加载失败'
            }"
          >
            <Wifi v-if="wsStatus === '已连接'" class="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <WifiOff v-else class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ wsStatus }}</span>
          </span>
        </div>

        <p class="text-xs sm:text-sm text-slate-500 pl-9">
          工作流名称: <strong>{{ currentRun.workflowName || `工作流 #${currentRun.workflowId}` }}</strong> · 执行 ID: <span class="font-mono font-bold text-slate-800">#{{ currentRun.id }}</span>
        </p>
      </div>

      <div class="flex items-center gap-2.5 pl-9 sm:pl-0">
        <!-- 只有 RUNNING 状态才显示"中断运行"按钮 -->
        <button
          v-if="(currentRun.status || '').toUpperCase() === 'RUNNING'"
          @click="handleStopRun"
          class="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold border border-rose-200 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Square class="w-4 h-4 fill-current" />
          <span>中断运行</span>
        </button>

        <!-- 非 RUNNING 状态显示"返回列表"按钮 -->
        <button
          v-if="(currentRun.status || '').toUpperCase() !== 'RUNNING'"
          @click="setRoute('runs')"
          class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>返回列表</span>
        </button>
      </div>
    </div>

    <!-- Execution Stats Bar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">节点执行进度</div>
        <div class="text-2xl font-extrabold text-slate-900 font-mono">
          {{ completedNodeCount }} / {{ totalNodeCount }}
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1 flex">
          <div
            v-for="seg in progressSegments"
            :key="seg.key"
            :class="seg.cls"
            class="h-2 transition-all duration-300"
            :style="{ width: seg.pct + '%' }"
          ></div>
        </div>
        <div
          v-if="nodeStatCounts.success + nodeStatCounts.failed + nodeStatCounts.terminated > 0"
          class="text-[11px] text-slate-400"
        >
          成功 {{ nodeStatCounts.success }} · 失败 {{ nodeStatCounts.failed }} · 终止 {{ nodeStatCounts.terminated }}
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">总耗时 (Duration)</div>
        <div class="text-2xl font-extrabold text-slate-900 font-mono">{{ formatDuration(displayDurationMs) }}</div>
        <div class="text-xs text-slate-400 font-mono">开始于: {{ formattedStartTime }}</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">Token 总用量</div>
        <div class="text-2xl font-extrabold text-indigo-600 font-mono">{{ formatTokens(totalTokensUsed) }}</div>
        <div class="text-xs text-indigo-400">包含 LLM 输入及打字机输出</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
        <div class="text-xs font-bold text-slate-400">触发方式</div>
        <div class="text-2xl font-extrabold text-slate-900 uppercase font-mono">{{ currentRun.triggerType || 'MANUAL' }}</div>
        <div class="text-xs text-slate-400">触发人: {{ currentRun.ownerName || currentRun.creatorName || '-' }}</div>
      </div>
    </div>

    <!-- Workflow Topology (read-only mini-DAG) -->
    <div
      v-if="workflowNodes.length > 0"
      class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3"
    >
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <div class="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <GitFork class="w-4 h-4 text-indigo-600" />
          <span>工作流拓扑</span>
          <span class="text-[11px] text-slate-400 font-normal">点击节点联动右侧输入/输出详情</span>
        </div>
        <!-- 图例 -->
        <div class="flex items-center gap-3 text-[11px] text-slate-500">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-500"></span>成功</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-500"></span>运行中</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-500"></span>失败</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-400"></span>未跑/终止</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <svg
          v-if="dagLayout"
          :viewBox="`${dagLayout.viewX} ${dagLayout.viewY} ${dagLayout.width} ${dagLayout.height}`"
          class="w-full h-56 min-w-[480px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <!-- 边：条件边虚线，普通边实线 -->
          <path
            v-for="e in workflowEdges"
            :key="e.id"
            :d="dagEdgePath(e)"
            fill="none"
            :stroke="getNodeStatus(e.source) === 'SUCCESS' ? '#94a3b8' : '#cbd5e1'"
            :stroke-width="getNodeStatus(e.source) === 'SUCCESS' ? 2 : 1.5"
            :stroke-dasharray="e.condition ? '6 4' : undefined"
          />
          <!-- 节点 -->
          <g
            v-for="n in workflowNodes"
            :key="n.id"
            class="cursor-pointer"
            @click="selectedNodeKey = String(n.id)"
          >
            <rect
              :x="n.position?.x ?? 0"
              :y="n.position?.y ?? 0"
              :width="DAG_NODE_W"
              :height="DAG_NODE_H"
              rx="10"
              :fill="dagStatusFill(String(n.id))"
              :stroke="selectedNodeKey === String(n.id) ? '#6366f1' : dagStatusStroke(String(n.id))"
              :stroke-width="selectedNodeKey === String(n.id) ? 2.5 : (getNodeStatus(String(n.id)) === 'RUNNING' ? 2.5 : 1.5)"
              :class="{ 'dag-node-running': getNodeStatus(String(n.id)) === 'RUNNING' }"
            />
            <!-- 悬停显示完整名称（浏览器原生 tooltip） -->
            <title>{{ n.data?.label ?? n.label ?? n.name ?? n.id }}</title>
            <text
              :x="(n.position?.x ?? 0) + DAG_NODE_W / 2"
              text-anchor="middle"
              class="fill-slate-700"
              style="font-size: 12px; font-weight: 600"
            >
              <tspan
                v-for="(line, li) in wrapNodeLabel(n.data?.label ?? n.label ?? n.name ?? n.id)"
                :key="li"
                :x="(n.position?.x ?? 0) + DAG_NODE_W / 2"
                :y="(n.position?.y ?? 0) + DAG_NODE_H / 2 + (wrapNodeLabel(n.data?.label ?? n.label ?? n.name ?? n.id).length === 1 ? 4 : (li === 0 ? -2 : 12))"
              >{{ line }}</tspan>
            </text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Left Node Status List (4 cols) -->
      <div class="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <GitFork class="w-4 h-4 text-indigo-600" />
            <span>节点执行状态</span>
          </div>
          <span class="text-xs text-slate-400">点击节点查看输入/输出</span>
        </div>

        <div class="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          <div
            v-for="node in nodeList"
            :key="node.nodeKey"
            @click="selectedNodeKey = node.nodeKey"
            class="p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5 relative overflow-hidden"
            :class="
              selectedNodeKey === node.nodeKey
                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            "
          >
            <!-- Running Pulse Bar -->
            <div
              v-if="getNodeStatus(node.nodeKey) === 'RUNNING'"
              class="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 animate-pulse"
            ></div>

            <div class="flex items-center justify-between text-xs sm:text-sm">
              <span class="font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu class="w-3.5 h-3.5 text-indigo-500" />
                <span>{{ node.nodeName || node.nodeKey }}</span>
              </span>

              <span
                class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase"
                :class="statusClass(getNodeStatus(node.nodeKey))"
              >
                {{ statusText(getNodeStatus(node.nodeKey)) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>耗时: <span class="font-mono">{{ getNodeStatus(node.nodeKey) === 'PENDING' ? '-' : `${nodeDurations[node.nodeKey] || node.durationMs || 0}ms` }}</span></span>
              <span>Tokens: <span class="font-mono">{{ getNodeStatus(node.nodeKey) === 'PENDING' ? '-' : formatTokens(nodeTokens[node.nodeKey] || node.tokens || 0) }}</span></span>
            </div>

            <!-- 性能指标：首token延迟 / LLM轮数 / 工具耗时（后端埋点，0=未采集则隐藏） -->
            <div
              v-if="getNodeStatus(node.nodeKey) === 'SUCCESS' && (nodeFirstTokenMs[node.nodeKey] || nodeLlmRounds[node.nodeKey] || nodeToolTimeMs[node.nodeKey])"
              class="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5"
            >
              <span v-if="nodeFirstTokenMs[node.nodeKey]">首token <span class="font-mono">{{ nodeFirstTokenMs[node.nodeKey] }}ms</span></span>
              <span v-if="nodeLlmRounds[node.nodeKey]">LLM <span class="font-mono">{{ nodeLlmRounds[node.nodeKey] }}轮</span></span>
              <span v-if="nodeToolTimeMs[node.nodeKey]">工具 <span class="font-mono">{{ formatDuration(nodeToolTimeMs[node.nodeKey]) }}</span></span>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>开始: {{ formatNodeStartTime(node.startedAt) }}</span>
            </div>

            <!-- 失败/终止原因摘要：单行截断，hover 显示全文 -->
            <div
              v-if="nodeErrors[node.nodeKey]"
              class="text-[11px] text-rose-500 truncate pt-0.5"
              :title="nodeErrors[node.nodeKey]"
            >
              {{ nodeErrors[node.nodeKey] }}
            </div>

            <!-- Typewriter stream badge -->
            <div
              v-if="nodeOutputs[node.nodeKey]"
              class="pt-1 flex items-center gap-1.5 text-[11px] font-semibold"
              :class="getNodeStatus(node.nodeKey) === 'RUNNING' ? 'text-indigo-600' : 'text-slate-400'"
            >
              <Sparkles class="w-3 h-3" :class="{ 'animate-spin': getNodeStatus(node.nodeKey) === 'RUNNING' }" />
              <span>{{ getNodeStatus(node.nodeKey) === 'RUNNING' ? '实时打字机输出中...' : '含流式输出分片' }}</span>
            </div>
          </div>

          <div v-if="nodeList.length === 0" class="py-10 text-center text-xs text-slate-400">
            暂无关联算子节点
          </div>
        </div>
      </div>

      <!-- Right Panel: Node Inspector + Real-time Logs (8 cols) -->
      <div class="lg:col-span-8 space-y-6">
        
        <!-- Node Input / Output Panel -->
        <div
          v-if="selectedNodeKey"
          class="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4"
        >
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div class="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
              <FileCode class="w-4 h-4 text-indigo-600" />
              <span>节点输入/输出 ({{ selectedNodeKey }})</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-slate-400">Status: {{ getNodeStatus(selectedNodeKey) }}</span>
              <span class="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                支持内部滚动，点击放大可全屏查看
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <!-- Input Card -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>输入</span>
                  <span class="text-[10px] text-slate-400 font-normal font-mono">({{ getInputLength(currentSelectedNodeInput) }} chars)</span>
                </span>

                <div class="flex items-center gap-1.5">
                  <button
                    @click="copyText(currentSelectedNodeInput, 'input')"
                    class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    :title="copiedState === 'input' ? '已复制' : '复制输入内容'"
                  >
                    <Check v-if="copiedState === 'input'" class="w-3.5 h-3.5 text-emerald-600" />
                    <Copy v-else class="w-3.5 h-3.5" />
                  </button>

                  <button
                    @click="isInputExpanded = !isInputExpanded"
                    class="px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded text-[11px] font-sans font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    :title="isInputExpanded ? '收起输入区域' : '展开输入区域'"
                  >
                    <ChevronUp v-if="isInputExpanded" class="w-3.5 h-3.5" />
                    <ChevronDown v-else class="w-3.5 h-3.5" />
                    <span>{{ isInputExpanded ? '收起' : '展开' }}</span>
                  </button>

                  <button
                    @click="openModal('输入内容 (' + selectedNodeKey + ')', currentSelectedNodeInput)"
                    class="px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded text-[11px] font-sans font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="弹窗全屏查看全部"
                  >
                    <Maximize2 class="w-3.5 h-3.5" />
                    <span>全屏</span>
                  </button>
                </div>
              </div>

              <!-- Input Code Container (Fixed Flat Height with Internal Scrollbar) -->
              <div
                class="relative bg-slate-950 rounded-2xl border border-slate-800 transition-all duration-200 overflow-hidden flex flex-col"
                :class="isInputExpanded ? 'h-[60vh]' : 'min-h-30 max-h-64'"
              >
                <div class="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950 select-text">
                  <pre class="text-slate-200 text-xs leading-relaxed font-mono whitespace-pre-wrap select-text">{{ currentSelectedNodeInput }}</pre>
                </div>
              </div>
            </div>

            <!-- Output Card -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>输出</span>
                  <span v-if="getNodeStatus(selectedNodeKey) === 'RUNNING'" class="text-[11px] text-indigo-500 font-sans font-semibold animate-pulse">
                    打字机生成中...
                  </span>
                  <span v-else class="text-[10px] text-slate-400 font-normal font-mono">({{ getInputLength(currentSelectedNodeOutput) }} chars)</span>
                </span>

                <div class="flex items-center gap-1.5">
                  <!-- 原文 / 渲染 切换 -->
                  <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      @click="isMarkdownView = false"
                      class="px-2 py-0.5 text-[11px] font-sans font-bold rounded-md transition-colors cursor-pointer"
                      :class="!isMarkdownView ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'"
                    >
                      原文
                    </button>
                    <button
                      @click="isMarkdownView = true"
                      class="px-2 py-0.5 text-[11px] font-sans font-bold rounded-md transition-colors cursor-pointer"
                      :class="isMarkdownView ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'"
                    >
                      渲染
                    </button>
                  </div>

                  <button
                    @click="copyText(currentSelectedNodeOutput, 'output')"
                    class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    :title="copiedState === 'output' ? '已复制' : '复制输出数据'"
                  >
                    <Check v-if="copiedState === 'output'" class="w-3.5 h-3.5 text-emerald-600" />
                    <Copy v-else class="w-3.5 h-3.5" />
                  </button>

                  <button
                    @click="isOutputExpanded = !isOutputExpanded"
                    class="px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded text-[11px] font-sans font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    :title="isOutputExpanded ? '收起输出区域' : '展开输出区域'"
                  >
                    <ChevronUp v-if="isOutputExpanded" class="w-3.5 h-3.5" />
                    <ChevronDown v-else class="w-3.5 h-3.5" />
                    <span>{{ isOutputExpanded ? '收起' : '展开' }}</span>
                  </button>

                  <button
                    @click="openModal('输出结果 (' + selectedNodeKey + ')', currentSelectedNodeOutput)"
                    class="px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded text-[11px] font-sans font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="弹窗全屏查看全部"
                  >
                    <Maximize2 class="w-3.5 h-3.5" />
                    <span>全屏</span>
                  </button>
                </div>
              </div>

              <!-- Output Code Container (Fixed Flat Height with Internal Scrollbar) -->
              <div
                class="relative bg-slate-950 rounded-2xl border border-slate-800 transition-all duration-200 overflow-hidden flex flex-col"
                :class="isOutputExpanded ? 'h-[60vh]' : (getNodeStatus(selectedNodeKey) === 'RUNNING' ? 'h-64' : 'min-h-30 max-h-64')"
              >
                <div
                  ref="outputContainer"
                  class="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950 select-text scroll-smooth"
                  :class="isMarkdownView ? 'bg-slate-950' : ''"
                >
                  <!-- 渲染视图：Markdown → HTML（DOMPurify 已消毒） -->
                  <div
                    v-if="isMarkdownView"
                    class="md-body text-xs"
                    v-html="renderedOutputHtml"
                  ></div>
                  <!-- 原文视图：打字机流式 -->
                  <pre
                    v-else
                    v-memo="[currentSelectedNodeOutput, getNodeStatus(selectedNodeKey)]"
                    class="text-emerald-300 text-xs leading-relaxed font-mono whitespace-pre-wrap select-text"
                  >{{ displayNodeOutput }}<span v-if="getNodeStatus(selectedNodeKey) === 'RUNNING'" class="inline-block w-2 h-3.5 bg-emerald-400 ml-0.5 animate-pulse align-middle"></span></pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Terminal Execution Logs Panel -->
        <div class="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 font-mono text-xs">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div class="flex items-center gap-2.5 text-slate-200 font-bold text-sm">
              <Terminal class="w-4 h-4 text-emerald-400" />
              <span>执行日志</span>
              <span class="text-[11px] font-normal px-2 py-0.5 bg-slate-900 text-slate-400 rounded-full border border-slate-800">
                共 {{ logs.length }} 条
              </span>
            </div>

            <div class="flex items-center gap-2 flex-wrap text-xs">
              <!-- Log Filter Search Input -->
              <div class="relative flex items-center">
                <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
                <input
                  v-model="logQuery"
                  type="text"
                  placeholder="过滤日志..."
                  class="pl-8 pr-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-500 w-28 sm:w-36 transition-all"
                />
              </div>

              <!-- Level Filter Filter Pills -->
              <div class="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  v-for="lvl in ['ALL', 'INFO', 'WARN', 'ERROR']"
                  :key="lvl"
                  @click="logLevelFilter = lvl"
                  class="px-2 py-0.5 text-[10px] font-sans font-bold rounded transition-colors cursor-pointer"
                  :class="
                    logLevelFilter === lvl
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  "
                >
                  {{ lvl }}
                </button>
              </div>

              <!-- Live WS connection label -->
              <span
                class="text-xs font-sans px-2.5 py-0.5 rounded-full font-semibold"
                :class="{
                  'text-emerald-400 bg-emerald-950/80 border border-emerald-800': wsStatus === '已连接',
                  'text-amber-400 bg-amber-950/80 border border-amber-800': wsStatus === '连接中...' || wsStatus === '重连中...',
                  'text-slate-400 bg-slate-900 border border-slate-800': wsStatus === '已断开' || wsStatus === '已完成'
                }"
              >
                {{ wsStatus }}
              </span>

              <button
                @click="autoScroll = !autoScroll"
                class="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                :title="autoScroll ? '已开启自动滚动到底部' : '已暂停自动滚动'"
              >
                <span :class="autoScroll ? 'text-emerald-400 font-bold' : 'text-slate-500'">
                  {{ autoScroll ? '● 自动滚动' : '○ 暂停滚动' }}
                </span>
              </button>

              <button
                @click="copyAllLogs"
                class="text-slate-400 hover:text-indigo-400 transition-colors p-1 rounded-md cursor-pointer"
                :title="copiedState === 'logs' ? '已复制日志' : '复制全部日志'"
              >
                <Check v-if="copiedState === 'logs'" class="w-3.5 h-3.5 text-emerald-400" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>

              <button
                @click="clearLogs"
                class="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-md cursor-pointer"
                title="清空执行日志"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Log stream list container with internal scrolling -->
          <div
            ref="logContainer"
            class="h-80 overflow-y-auto space-y-2 pr-2 text-slate-300 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950 scroll-smooth"
          >
            <div
              v-for="(log, idx) in filteredLogs"
              :key="idx"
              class="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/60 p-1 rounded-md transition-colors"
            >
              <span class="text-slate-500 shrink-0 select-none">[{{ log.time }}]</span>
              <span
                class="uppercase text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 select-none"
                :class="
                  log.level === 'error'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : log.level === 'warn'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                "
              >
                {{ log.level }}
              </span>
              <span :class="log.level === 'error' ? 'text-rose-300' : 'text-slate-200'" class="text-xs break-all select-text">
                {{ log.message }}
              </span>
            </div>

            <div v-if="filteredLogs.length === 0" class="py-12 text-center text-slate-600 italic">
              {{ logs.length > 0 ? '无匹配该过滤条件的日志记录' : '等待推流事件下发中...' }}
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Fullscreen JSON / Output Inspector Modal -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      @click.self="closeModal"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5 text-slate-100 font-bold text-sm">
            <FileCode class="w-4 h-4 text-indigo-400" />
            <span>{{ modalTitle }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="copyText(modalContent, 'modal')"
              class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check v-if="copiedState === 'modal'" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copiedState === 'modal' ? '已复制' : '复制内容' }}</span>
            </button>

            <button
              @click="closeModal"
              class="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Modal Content Body -->
        <div class="p-6 overflow-y-auto flex-1 font-mono text-xs text-emerald-300 leading-relaxed bg-slate-950">
          <pre class="whitespace-pre-wrap select-text">{{ modalContent }}</pre>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            @click="closeModal"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Activity,
  GitFork,
  Square,
  Terminal,
  FileCode,
  Wifi,
  WifiOff,
  Cpu,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Copy,
  Check,
  Search,
  X,
} from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { api, tokenManager, mapRunDtoToRunRecord, mapWorkflowDtoToWorkflow } from '../../api';
import { WebSocketEvent } from '../../types';

const { state, setRoute, stopRun, updateRunInStore } = useAppStore();

// UI States for Expansion & Modal
const isInputExpanded = ref(false);
const isOutputExpanded = ref(false);
const copiedState = ref<string | null>(null);

// 输出 Markdown 渲染视图（默认原文，打字机流式期间观感更好且渲染开销低）
const isMarkdownView = ref(false);
const markdownRenderer = new MarkdownIt({ breaks: true, linkify: true });

const logContainer = ref<HTMLDivElement | null>(null);
const outputContainer = ref<HTMLDivElement | null>(null);

const logQuery = ref('');
const logLevelFilter = ref('ALL');

const isModalOpen = ref(false);
const modalTitle = ref('');
const modalContent = ref('');

// Current Run record from Backend API or Store
const currentRun = ref<any>(null);
const isFetchingRun = ref(false);

// 工作流拓扑数据（只读 DAG 渲染）：来自 api.getWorkflow，节点 id 即 nodeKey
const workflowNodes = ref<any[]>([]);
const workflowEdges = ref<any[]>([]);

/** 拉取工作流快照渲染拓扑图；失败静默降级（不影响其余监控功能） */
async function loadWorkflowTopology() {
  const wfId = currentRun.value?.workflowId;
  if (!wfId || workflowNodes.value.length > 0) return;
  try {
    // 后端返回原始 DTO（nodeKey/positionX/positionY/name），必须经 mapWorkflowDtoToWorkflow
    // 映射为画布形状（id/position{x,y}/data.label），否则渲染字段错位：
    // 节点全部叠在 (0,0)、连线消失、状态无法着色
    const wf = mapWorkflowDtoToWorkflow(await api.getWorkflow(wfId));
    if (wf && Array.isArray(wf.nodes)) {
      workflowNodes.value = wf.nodes;
      workflowEdges.value = Array.isArray(wf.edges) ? wf.edges : [];
    }
  } catch (err) {
    console.warn('拉取工作流拓扑失败（拓扑图将不显示，其余功能不受影响）:', err);
  }
}

// WebSocket Status state
const ws = ref<WebSocket | null>(null);
const wsStatus = ref<string>('连接中...'); // 连接中.../已连接/已断开/重连中.../已完成
const lastEventSeq = ref(0);
const seenSeq = new Set<number>();
const heartbeatTimer = ref<any>(null);
const reconnectTimer = ref<any>(null);
const runFinished = ref(false);

// Reactive Node Maps
const nodeStatuses = reactive<Record<string, string>>({});  // nodeKey -> 'PENDING'|'RUNNING'|'SUCCESS'|'FAILED'
const nodeOutputs = reactive<Record<string, string>>({});   // nodeKey -> typewriter stream text
const nodeInputs = reactive<Record<string, string>>({});    // nodeKey -> input json text
const nodeTokens = reactive<Record<string, number>>({});    // nodeKey -> tokens used
const nodeDurations = reactive<Record<string, number>>({}); // nodeKey -> duration ms
const nodeErrors = reactive<Record<string, string>>({});   // nodeKey -> 失败/终止原因摘要

// 节点性能指标（来自 tokensUsed 的 first_token_ms / llm_rounds / tool_time_ms；0 = 未采集）
const nodeFirstTokenMs = reactive<Record<string, number>>({});
const nodeLlmRounds = reactive<Record<string, number>>({});
const nodeToolTimeMs = reactive<Record<string, number>>({});

// Logs list
const logs = reactive<Array<{ time: string; level: string; message: string }>>([]);
const autoScroll = ref(true);

// Selected node key
const selectedNodeKey = ref<string | null>(null);

// Node Output Display Area state
const selectedOutputNodeKey = ref<string | null>(null);
const nodeOutputDisplayContainer = ref<HTMLDivElement | null>(null);

// 按真实开始执行时间稳定排序：已开跑的节点按 startedAt 升序在前，
// 未开跑的（PENDING/SKIPPED，startedAt 为空）沉底并保持原始相对顺序。
// 仅在数据拉取时执行一次；WebSocket 状态更新不触发重排（startedAt 不可变，位置天然稳定）。
function sortByExecutionOrder<T extends { startedAt?: string | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : null;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : null;
    if (ta === null && tb === null) return 0;   // 都未开跑：保持原序（sort 稳定）
    if (ta === null) return 1;                   // 未开跑沉底
    if (tb === null) return -1;
    return ta - tb;
  });
}

function formatNodeStartTime(startedAt?: string | null): string {
  if (!startedAt) return '-';
  try {
    const d = new Date(startedAt);
    if (!isNaN(d.getTime())) {
      return d.toTimeString().slice(0, 8);
    }
    if (startedAt.includes('T')) {
      return startedAt.split('T')[1].slice(0, 8);
    }
    if (startedAt.includes(' ')) {
      return startedAt.split(' ')[1].slice(0, 8);
    }
    return startedAt.slice(0, 8);
  } catch {
    return '-';
  }
}

/** 毫秒转人性化时长：987ms → "987ms"；65s → "1m 5s"；3700s → "1h 1m" */
function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Token 千分位：12345 → "12,345"；123500 → "123.5k" */
function formatTokens(n: number): string {
  if (n == null || isNaN(n)) return '0';
  if (n >= 100000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString('en-US');
}

// ============ mini-DAG 渲染辅助 ============
const DAG_NODE_W = 120;   // 节点框宽（SVG 用户单位）
const DAG_NODE_H = 44;    // 节点框高

/** viewBox 自适应：按节点画布坐标计算包围盒（含 padding） */
const dagLayout = computed(() => {
  const nodes = workflowNodes.value;
  if (nodes.length === 0) return null;
  const PAD = 40;
  const xs = nodes.map((n: any) => n.position?.x ?? 0);
  const ys = nodes.map((n: any) => n.position?.y ?? 0);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const maxX = Math.max(...xs) + DAG_NODE_W + PAD;
  const maxY = Math.max(...ys) + DAG_NODE_H + PAD;
  return { viewX: minX, viewY: minY, width: maxX - minX, height: maxY - minY };
});

/** 边路径：水平三次贝塞尔（源右侧 → 目标左侧） */
function dagEdgePath(e: any): string {
  const s = workflowNodes.value.find((n: any) => String(n.id) === String(e.source));
  const t = workflowNodes.value.find((n: any) => String(n.id) === String(e.target));
  if (!s || !t) return '';
  const x1 = (s.position?.x ?? 0) + DAG_NODE_W;
  const y1 = (s.position?.y ?? 0) + DAG_NODE_H / 2;
  const x2 = t.position?.x ?? 0;
  const y2 = (t.position?.y ?? 0) + DAG_NODE_H / 2;
  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/** 标签视觉宽度：CJK 全角字符计 2，半角计 1（12px 字号下的近似宽度单位） */
function labelVisualWidth(ch: string): number {
  const code = ch.codePointAt(0) || 0;
  // CJK 统一表意文字 + 全角标点 + CJK 符号等按 2 计
  const isCJK = (code >= 0x2E80 && code <= 0x9FFF)
    || (code >= 0xF900 && code <= 0xFAFF)
    || (code >= 0xFF00 && code <= 0xFF60)
    || (code >= 0x3000 && code <= 0x303F);
  return isCJK ? 2 : 1;
}

/**
 * 把节点名称折行为最多 2 行的数组。
 * 每行视觉宽度 ≤ 16 单位（约 8 个汉字 / 16 个半角字符）；
 * 两行仍放不下时第二行末尾以 … 截断。
 */
function wrapNodeLabel(label: string): string[] {
  const text = String(label || '').trim();
  if (!text) return [''];
  const MAX_PER_LINE = 16;
  const lines: string[] = [];
  let current = '';
  let currentW = 0;
  for (const ch of text) {
    const w = labelVisualWidth(ch);
    if (currentW + w > MAX_PER_LINE) {
      lines.push(current);
      current = ch;
      currentW = w;
      if (lines.length === 2) break;   // 最多 2 行，剩余交给省略号
    } else {
      current += ch;
      currentW += w;
    }
  }
  if (lines.length < 2 && current) lines.push(current);
  // 未耗尽原文（还有字符没排进去）→ 第二行末尾加省略号
  const consumed = lines.join('');
  if (consumed.length < text.length && lines.length === 2) {
    lines[1] = lines[1].slice(0, -1) + '…';
  }
  return lines.slice(0, 2);
}

/** 节点状态 → 填充色（Tailwind 色板十六进制） */
function dagStatusFill(nodeKey: string): string {
  switch (getNodeStatus(nodeKey)) {
    case 'SUCCESS': return '#d1fae5';      // emerald-100
    case 'RUNNING': return '#fef3c7';      // amber-100
    case 'FAILED': return '#ffe4e6';       // rose-100
    case 'TERMINATED': return '#f1f5f9';   // slate-100
    default: return '#f8fafc';             // slate-50（PENDING）
  }
}

/** 节点状态 → 描边色 */
function dagStatusStroke(nodeKey: string): string {
  switch (getNodeStatus(nodeKey)) {
    case 'SUCCESS': return '#10b981';
    case 'RUNNING': return '#f59e0b';
    case 'FAILED': return '#f43f5e';
    case 'TERMINATED': return '#94a3b8';
    default: return '#cbd5e1';
  }
}

// Computed list of nodes for UI
const nodeList = computed(() => {
  if (!currentRun.value) return [];
  if (Array.isArray(currentRun.value.nodeStates) && currentRun.value.nodeStates.length > 0) {
    return sortByExecutionOrder(currentRun.value.nodeStates.map((ns: any) => ({
      nodeKey: ns.nodeId || ns.nodeKey || 'node-1',
      nodeName: ns.nodeName || ns.nodeKey || '节点',
      status: ns.status,
      durationMs: ns.durationMs,
      tokens: ns.tokens,
      startedAt: ns.startedAt || null,
    })));
  }
  if (Array.isArray(currentRun.value.nodes)) {
    return sortByExecutionOrder(currentRun.value.nodes.map((n: any) => ({
      nodeKey: n.nodeKey || String(n.id),
      nodeName: n.nodeName || n.nodeKey || '节点',
      status: n.status,
      durationMs: n.durationMs,
      tokens: n.tokens,
      startedAt: n.startedAt ?? null,
    })));
  }
  // Fallback default node if empty
  return [
    {
      nodeKey: 'node-1',
      nodeName: 'DAG 节点',
      status: currentRun.value.status || 'PENDING',
      durationMs: currentRun.value.durationMs || 0,
      tokens: currentRun.value.tokensUsed || 0,
      startedAt: currentRun.value.startedAt || null,
    },
  ];
});

const totalNodeCount = computed(() => {
  return currentRun.value?.totalNodes || nodeList.value.length || 1;
});

const completedNodeCount = computed(() => {
  // 终止也视为"已结束"：进度统计应计入终止节点，避免进度条卡在中途
  const completedFromStatuses = Object.values(nodeStatuses).filter(
    (s) => s === 'SUCCESS' || s === 'TERMINATED'
  ).length;
  if (completedFromStatuses > 0) return completedFromStatuses;
  return currentRun.value?.completedNodes || 0;
});

// 运行中时长跳动：每秒更新 nowTick，驱动 displayDurationMs 重算
const nowTick = ref(Date.now());
let elapsedTimer: any = null;

watch(
  () => currentRun.value?.status,
  (status) => {
    const running = (status || '').toUpperCase() === 'RUNNING';
    if (running && elapsedTimer == null) {
      elapsedTimer = window.setInterval(() => { nowTick.value = Date.now(); }, 1000);
    } else if (!running && elapsedTimer != null) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  },
  { immediate: true }
);

// 展示用时：运行中 = 当前时间 - 开始时间（每秒跳动）；已结束 = 后端 durationMs
const displayDurationMs = computed(() => {
  const status = (currentRun.value?.status || '').toUpperCase();
  if (status === 'RUNNING' && currentRun.value?.startTime) {
    const start = new Date(currentRun.value.startTime).getTime();
    if (!isNaN(start)) return Math.max(0, nowTick.value - start);
  }
  return currentRun.value?.durationMs || 0;
});

// 节点终态计数（分段进度条 + 图例数据源）
const nodeStatCounts = computed(() => {
  const counts = { success: 0, failed: 0, terminated: 0 };
  for (const s of Object.values(nodeStatuses)) {
    if (s === 'SUCCESS') counts.success++;
    else if (s === 'FAILED') counts.failed++;
    else if (s === 'TERMINATED') counts.terminated++;
  }
  return counts;
});

// 分段进度条：成功绿 / 失败红 / 终止灰；无节点明细时退化为整体单色条（兼容 store 兜底数据）
const progressSegments = computed(() => {
  const c = nodeStatCounts.value;
  const hasDetail = c.success + c.failed + c.terminated > 0;
  if (!hasDetail) {
    return [{
      key: 'done',
      cls: 'bg-indigo-600',
      pct: (completedNodeCount.value / (totalNodeCount.value || 1)) * 100,
    }];
  }
  const total = totalNodeCount.value || 1;
  return [
    { key: 'success', cls: 'bg-emerald-500', pct: (c.success / total) * 100 },
    { key: 'failed', cls: 'bg-rose-500', pct: (c.failed / total) * 100 },
    { key: 'terminated', cls: 'bg-slate-400', pct: (c.terminated / total) * 100 },
  ];
});

const totalTokensUsed = computed(() => {
  const sumTokensFromNodes = Object.values(nodeTokens).reduce((a, b) => a + b, 0);
  if (sumTokensFromNodes > 0) return sumTokensFromNodes;
  return currentRun.value?.tokensUsed || 0;
});

const formattedStartTime = computed(() => {
  if (!currentRun.value?.startTime) return '--:--:--';
  return currentRun.value.startTime.includes('T')
    ? currentRun.value.startTime.split('T')[1].slice(0, 8)
    : currentRun.value.startTime.slice(-8);
});

/**
 * 解包输入上下文：后端每个节点落库时把纯文本输入包装为 {"input": "纯文本"}（JSONB，
 * 见 WorkflowExecutorService.buildInputContextMap）。若上游 Agent 的输出本身回显了
 * 包装 JSON，下游落库会再包一层，形成多层嵌套，因此需要循环逐层解包。
 *
 * 解包条件（后端包装契约的精确形状）：对象恰好只有一个 input 键且值为 string。
 * 命中则剥掉一层继续判断；业务 JSON（如 {"pr_url": "..."} 或含其他键）不解包。
 * 深度上限 10 层，防御异常数据导致的理论死循环。
 */
function extractInputText(raw: unknown): string {
  if (raw == null) return '';
  let value: any = raw;
  for (let depth = 0; depth < 10; depth++) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      if (!trimmed.startsWith('{')) return trimmed; // 纯文本
      try {
        value = JSON.parse(trimmed);
      } catch {
        return trimmed; // 以 { 开头但非合法 JSON，视为纯文本
      }
    }
    // 对象形态：仅当"恰好只有一个 input 键且值为 string"（精确包装契约）时剥一层
    if (value && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === 1
        && typeof value.input === 'string') {
      value = value.input; // 剥出的内层可能是纯文本，也可能是下一层包装，交由循环继续判断
      continue;
    }
    // 非包装结构：对象/数组格式化展示
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

const currentSelectedNodeInput = computed(() => {
  if (!selectedNodeKey.value) return '';
  if (nodeInputs[selectedNodeKey.value]) return extractInputText(nodeInputs[selectedNodeKey.value]);
  const found = currentRun.value?.nodeStates?.find((n: any) => (n.nodeId || n.nodeKey) === selectedNodeKey.value);
  if (found?.inputJson && found.inputJson !== '{}') return extractInputText(found.inputJson);
  if (currentRun.value?.input) return extractInputText(currentRun.value.input);
  if (found?.inputJson) return extractInputText(found.inputJson);
  return '';
});

const currentSelectedNodeOutput = computed(() => {
  if (!selectedNodeKey.value) return '等待节点响应...';
  if (nodeOutputs[selectedNodeKey.value]) return nodeOutputs[selectedNodeKey.value];
  const found = currentRun.value?.nodeStates?.find((n: any) => (n.nodeId || n.nodeKey) === selectedNodeKey.value);
  return found?.outputJson || currentRun.value?.output || '等待输出...';
});

// 超长输出渲染保护：仅渲染末尾 100KB，复制/全屏仍走完整文本
const MAX_RENDER_CHARS = 100 * 1024;
const displayNodeOutput = computed(() => {
  const text = currentSelectedNodeOutput.value;
  if (!text || text.length <= MAX_RENDER_CHARS) return text;
  return `…（内容超长，前 ${text.length - MAX_RENDER_CHARS} 字符已折叠，点击"全屏"或"复制"获取完整内容）\n${text.slice(-MAX_RENDER_CHARS)}`;
});

/** 渲染输出 HTML（DOMPurify 消毒防 XSS；仅渲染视图激活时才计算） */
const renderedOutputHtml = computed(() => {
  if (!isMarkdownView.value) return '';
  const text = displayNodeOutput.value || '';
  if (!text) return '';
  return DOMPurify.sanitize(markdownRenderer.render(text));
});

// All nodes for Output Display Area Tabs
const allOutputNodes = computed(() => {
  if (!currentRun.value) return [];
  if (Array.isArray(currentRun.value.nodeRuns) && currentRun.value.nodeRuns.length > 0) {
    return currentRun.value.nodeRuns.map((nr: any) => ({
      nodeKey: nr.nodeKey || nr.nodeId || 'node-1',
      nodeName: nr.nodeName || nr.nodeKey || '节点',
      status: nr.status,
    }));
  }
  return nodeList.value;
});

// Auto-select node tab for Output Display Area
watch(
  () => allOutputNodes.value,
  (nodes) => {
    if (nodes.length === 0) return;
    if (!selectedOutputNodeKey.value || !nodes.some((n: any) => n.nodeKey === selectedOutputNodeKey.value)) {
      const lastSuccess = [...nodes].reverse().find((n: any) => nodeStatuses[n.nodeKey] === 'SUCCESS');
      selectedOutputNodeKey.value = lastSuccess?.nodeKey || nodes[nodes.length - 1]?.nodeKey || nodes[0].nodeKey;
    }
  },
  { immediate: true, deep: true }
);

// Output text for selected node in Node Output Display Area
const currentNodeOutputText = computed(() => {
  if (!selectedOutputNodeKey.value) return '';

  if (nodeOutputs[selectedOutputNodeKey.value]) {
    return nodeOutputs[selectedOutputNodeKey.value];
  }

  if (Array.isArray(currentRun.value?.nodeRuns)) {
    const found = currentRun.value.nodeRuns.find((n: any) => (n.nodeKey || n.nodeId) === selectedOutputNodeKey.value);
    if (found?.output) {
      return typeof found.output === 'object' ? JSON.stringify(found.output, null, 2) : String(found.output);
    }
    if (found?.outputJson) {
      return typeof found.outputJson === 'object' ? JSON.stringify(found.outputJson, null, 2) : String(found.outputJson);
    }
  }

  if (Array.isArray(currentRun.value?.nodeStates)) {
    const found = currentRun.value.nodeStates.find((n: any) => (n.nodeId || n.nodeKey) === selectedOutputNodeKey.value);
    if (found?.outputJson) {
      return typeof found.outputJson === 'object' ? JSON.stringify(found.outputJson, null, 2) : String(found.outputJson);
    }
    if (found?.output) {
      return typeof found.output === 'object' ? JSON.stringify(found.output, null, 2) : String(found.output);
    }
  }

  if (allOutputNodes.value.length === 1 && currentRun.value?.output) {
    return typeof currentRun.value.output === 'object'
      ? JSON.stringify(currentRun.value.output, null, 2)
      : String(currentRun.value.output);
  }

  return '';
});

// Auto-scroll output container on new streamed content
watch(currentSelectedNodeOutput, () => {
  nextTick(() => {
    if (outputContainer.value) {
      outputContainer.value.scrollTop = outputContainer.value.scrollHeight;
    }
  });
});

watch(currentNodeOutputText, () => {
  nextTick(() => {
    if (nodeOutputDisplayContainer.value) {
      nodeOutputDisplayContainer.value.scrollTop = nodeOutputDisplayContainer.value.scrollHeight;
    }
  });
});

function copyNodeOutput() {
  if (!currentNodeOutputText.value) return;
  copyText(currentNodeOutputText.value, 'nodeOutput');
}

function exportMarkdown() {
  if (!currentNodeOutputText.value) return;
  const blob = new Blob([currentNodeOutputText.value], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const wfName = currentRun.value?.workflowName || 'workflow';
  const nodeKey = selectedOutputNodeKey.value || 'output';
  a.download = `${wfName}_${nodeKey}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Computed filtered log stream for search/level filtering
const filteredLogs = computed(() => {
  return logs.filter((log) => {
    // Level filter
    if (logLevelFilter.value !== 'ALL') {
      if (log.level.toLowerCase() !== logLevelFilter.value.toLowerCase()) {
        return false;
      }
    }
    // Query filter
    if (logQuery.value.trim()) {
      const q = logQuery.value.trim().toLowerCase();
      const matchMsg = log.message ? log.message.toLowerCase().includes(q) : false;
      const matchLevel = log.level ? log.level.toLowerCase().includes(q) : false;
      const matchTime = log.time ? log.time.includes(q) : false;
      return matchMsg || matchLevel || matchTime;
    }
    return true;
  });
});

function getInputLength(val?: string): number {
  if (!val) return 0;
  return val.length;
}

function copyText(val: string, key: string) {
  if (!val) return;
  navigator.clipboard.writeText(val);
  copiedState.value = key;
  setTimeout(() => {
    if (copiedState.value === key) {
      copiedState.value = null;
    }
  }, 2000);
}

function copyAllLogs() {
  if (logs.length === 0) return;
  const text = logs.map((l) => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
  copyText(text, 'logs');
}

function openModal(title: string, content: string) {
  modalTitle.value = title;
  modalContent.value = content || '{}';
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

// Helper for status text
function statusText(status: string | undefined): string {
  if (!status) return '等待中';
  const upper = status.toUpperCase();
  const map: Record<string, string> = {
    PENDING: '等待中',
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    TERMINATED: '已终止',
    CANCELED: '已取消',
  };
  return map[upper] || status;
}

// Helper for status styling class
function statusClass(status: string | undefined): string {
  if (!status) return 'bg-slate-50 text-slate-700 border border-slate-200';
  const upper = status.toUpperCase();
  const map: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
    RUNNING: 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse',
    SUCCESS: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-700 border border-rose-200',
    TERMINATED: 'bg-slate-50 text-slate-700 border border-slate-200',
    CANCELED: 'bg-slate-50 text-slate-700 border border-slate-200',
  };
  return map[upper] || 'bg-slate-50 text-slate-700 border border-slate-200';
}

function getNodeStatus(nodeKey: string): string {
  return nodeStatuses[nodeKey] || 'PENDING';
}

function clearLogs() {
  logs.length = 0;
}

function addLog(level: string, message: string, timestamp?: string) {
  let timeStr = new Date().toTimeString().slice(0, 8);
  if (timestamp) {
    if (timestamp.includes('T')) {
      timeStr = timestamp.split('T')[1].slice(0, 8);
    } else if (timestamp.includes(' ')) {
      timeStr = timestamp.split(' ')[1].slice(0, 8);
    } else {
      timeStr = timestamp.slice(-8);
    }
  }

  // Memory safeguard: Cap maximum logs in UI state at 1000 items
  if (logs.length >= 1000) {
    logs.shift();
  }

  logs.push({
    time: timeStr,
    level: level || 'info',
    message,
  });

  scrollLogContainerToBottom();
}

let logScrollRaf: number | null = null;
function scrollLogContainerToBottom() {
  if (!autoScroll.value || !logContainer.value) return;
  if (logScrollRaf !== null) return;
  logScrollRaf = requestAnimationFrame(() => {
    if (logContainer.value && autoScroll.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
    logScrollRaf = null;
  });
}

async function handleStopRun() {
  if (!currentRun.value?.id) return;
  try {
    await api.terminateRun(currentRun.value.id);
    addLog('warn', `用户主动通过前端发起了中断请求`);
  } catch (err) {
    stopRun(currentRun.value.id);
  }
  currentRun.value.status = 'TERMINATED';
  updateRunInStore(currentRun.value.id, 'TERMINATED');
  // 乐观收尾：run 级终止事件到达前，把仍显示 RUNNING/PENDING 的节点置为已终止
  //（后端收尾事件最终会覆盖为准确状态，此处仅避免 UI 短暂停留在"运行中"）
  for (const key of Object.keys(nodeStatuses)) {
    if (nodeStatuses[key] === 'RUNNING' || nodeStatuses[key] === 'PENDING') {
      nodeStatuses[key] = 'TERMINATED';
      if (!nodeErrors[key]) nodeErrors[key] = '执行被用户终止';
    }
  }
}

function connectWebSocket(runId: number | string, token: string) {
  disconnect(); // Clear existing WS connection

  // 地址跟随页面当前协议+域名+端口：本地走 Vite /ws 代理，生产走 Nginx /ws 反代，
  // 不再直连后端 8080（生产 8080 不对公网开放且无 TLS，直连必然失败）
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/v1/runs/${runId}?token=${encodeURIComponent(token)}`;

  wsStatus.value = '连接中...';

  ws.value = new WebSocket(wsUrl);

  ws.value.onopen = () => {
    wsStatus.value = '已连接';
    addLog('info', `WebSocket 长连接建立成功`);

    // 心跳（25 秒一次，服务端 30 秒超时）
    heartbeatTimer.value = window.setInterval(() => {
      if (ws.value?.readyState === WebSocket.OPEN) {
        ws.value.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 25000);

    // 连接成功后立即发送 replay 请求，拿回订阅前发出的全量/增量事件（如 node 1 的 NODE_STARTED）
    const replayMsg: any = { type: 'replay', runId };
    if (lastEventSeq.value > 0) {
      replayMsg.lastEventSeq = lastEventSeq.value;
    }
    ws.value.send(JSON.stringify(replayMsg));
  };

  ws.value.onmessage = (event) => {
    try {
      const data: WebSocketEvent = JSON.parse(event.data);

      // 按 eventSeq 严格去重，避免 live 广播与 replay 重复导致 OUTPUT_CHUNK 翻倍
      if (data.eventSeq != null) {
        if (seenSeq.has(data.eventSeq)) {
          return; // 重复事件，忽略
        }
        seenSeq.add(data.eventSeq);
        if (data.eventSeq > lastEventSeq.value) {
          lastEventSeq.value = data.eventSeq;
        }
      }

      handleWebSocketEvent(data);
    } catch (err) {
      console.error('解析 WebSocket 事件异常:', err);
    }
  };

  ws.value.onerror = (error) => {
    console.error('WebSocket 通讯发生错误:', error);
    if (wsStatus.value !== '已完成') {
      wsStatus.value = '已断开';
    }
  };

  ws.value.onclose = () => {
    if (heartbeatTimer.value) {
      clearInterval(heartbeatTimer.value);
      heartbeatTimer.value = null;
    }

    if (!runFinished.value && currentRun.value && currentRun.value.status === 'RUNNING') {
      wsStatus.value = '重连中...';
      addLog('warn', `WebSocket 连接断开，3 秒后尝试自动重连...`);
      reconnectTimer.value = setTimeout(() => reconnect(runId, token), 3000);
    } else {
      if (runFinished.value) {
        wsStatus.value = '已完成';
      } else {
        wsStatus.value = '已断开';
      }
    }
  };
}

// OUTPUT_CHUNK 批量合并缓冲：token 级分片可达每秒近百次，逐条拼接会触发等频
// 响应式更新与 DOM 重排；先入缓冲，每帧至多 flush 一次（≈60 次/秒，观感无差别）
const chunkBuffers = new Map<string, string[]>();
let chunkFlushRaf: number | null = null;

function flushChunkBuffers() {
  chunkFlushRaf = null;
  if (chunkBuffers.size === 0) return;
  for (const [key, parts] of chunkBuffers) {
    if (parts.length === 0) continue;
    nodeOutputs[key] = (nodeOutputs[key] || '') + parts.join('');
  }
  chunkBuffers.clear();
}

function scheduleChunkFlush() {
  if (chunkFlushRaf !== null) return;
  chunkFlushRaf = requestAnimationFrame(flushChunkBuffers);
}

function handleWebSocketEvent(data: WebSocketEvent) {
  if (!currentRun.value) return;

  switch (data.eventType) {
    case 'RUN_STARTED': {
      const currentStatus = (currentRun.value?.status || '').toUpperCase();
      const isAlreadyFinished = currentStatus === 'SUCCESS' || currentStatus === 'FAILED' || currentStatus === 'TERMINATED';
      if (!isAlreadyFinished) {
        currentRun.value.status = 'RUNNING';
        runFinished.value = false;
        updateRunInStore(currentRun.value.id, 'RUNNING');
      }
      addLog('info', `工作流开始执行`, data.timestamp);
      break;
    }

    case 'NODE_STARTED': {
      const nodeKey = data.nodeKey || 'node-1';
      nodeStatuses[nodeKey] = 'RUNNING';
      nodeOutputs[nodeKey] = '';
      delete nodeErrors[nodeKey];
      if (!selectedNodeKey.value) selectedNodeKey.value = nodeKey;

      if (data.payload?.input) {
        const inputVal = data.payload.input;
        nodeInputs[nodeKey] = typeof inputVal === 'object'
          ? JSON.stringify(inputVal, null, 2)
          : String(inputVal);
      }

      addLog('info', `节点 ${data.payload?.agentName || nodeKey} 开始执行`, data.timestamp);
      break;
    }

    case 'OUTPUT_CHUNK': {
      const nodeKey = data.nodeKey || selectedNodeKey.value || 'node-1';
      const chunk = data.payload?.chunk || '';
      if (chunk) {
        let parts = chunkBuffers.get(nodeKey);
        if (!parts) {
          parts = [];
          chunkBuffers.set(nodeKey, parts);
        }
        parts.push(chunk);
        scheduleChunkFlush();
      }

      if (!selectedNodeKey.value) {
        selectedNodeKey.value = nodeKey;
      }
      // Auto switch output display tab to currently streaming node
      selectedOutputNodeKey.value = nodeKey;
      break;
    }

    case 'TOOL_CALLED': {
      const toolName = data.payload?.toolName || 'Tool';
      const args = typeof data.payload?.args === 'object'
        ? JSON.stringify(data.payload.args)
        : (data.payload?.args || '');
      addLog('info', `工具调用: ${toolName}(${args})`, data.timestamp);
      break;
    }

    case 'NODE_FINISHED': {
      const nodeKey = data.nodeKey || 'node-1';
      nodeStatuses[nodeKey] = 'SUCCESS';
      delete nodeErrors[nodeKey];
      chunkBuffers.delete(nodeKey);
      
      const tokensUsed = data.payload?.tokensUsed;
      const totalTokens = typeof tokensUsed === 'object' && tokensUsed !== null
        ? (tokensUsed.totalTokens || tokensUsed.total_tokens || 0)
        : (typeof tokensUsed === 'number' ? tokensUsed : 0);
      nodeTokens[nodeKey] = totalTokens;
      nodeDurations[nodeKey] = data.payload?.durationMs || 0;

      // 性能指标解析（0 / undefined = 未采集）
      if (typeof tokensUsed === 'object' && tokensUsed !== null) {
        if (tokensUsed.first_token_ms) nodeFirstTokenMs[nodeKey] = Number(tokensUsed.first_token_ms);
        if (tokensUsed.llm_rounds) nodeLlmRounds[nodeKey] = Number(tokensUsed.llm_rounds);
        if (tokensUsed.tool_time_ms) nodeToolTimeMs[nodeKey] = Number(tokensUsed.tool_time_ms);
      }

      const inputVal = data.payload?.input;
      if (inputVal != null) {
        nodeInputs[nodeKey] = typeof inputVal === 'object'
          ? JSON.stringify(inputVal, null, 2)
          : String(inputVal);
      }

      const finalOutput = data.payload?.output;
      if (finalOutput != null) {
        nodeOutputs[nodeKey] = typeof finalOutput === 'object'
          ? JSON.stringify(finalOutput, null, 2)
          : String(finalOutput);
      }

      addLog('info', `节点 ${nodeKey} 完成，Token: ${totalTokens}`, data.timestamp);
      break;
    }

    case 'NODE_FAILED': {
      const nodeKey = data.nodeKey || 'node-1';
      // 区分"执行失败"与"被用户终止"：后端终止事件带 terminated 标志
      const isTerminated = Boolean(data.payload?.terminated);
      nodeStatuses[nodeKey] = isTerminated ? 'TERMINATED' : 'FAILED';
      chunkBuffers.delete(nodeKey);

      const inputVal = data.payload?.input;
      if (inputVal != null) {
        nodeInputs[nodeKey] = typeof inputVal === 'object'
          ? JSON.stringify(inputVal, null, 2)
          : String(inputVal);
      }

      const errText = data.payload?.errorMsg || (isTerminated ? '执行被用户终止' : '执行报错');
      nodeErrors[nodeKey] = errText;

      if (isTerminated) {
        addLog('warn', `节点 ${nodeKey} 已终止: ${errText}`, data.timestamp);
      } else {
        addLog('error', `节点 ${nodeKey} 失败: ${errText}`, data.timestamp);
      }
      break;
    }

    case 'NODE_RETRYING': {
      const nodeKey = data.nodeKey || 'node-1';
      addLog('warn', `节点 ${nodeKey} 第 ${data.payload?.retryCount || 1} 次重试: ${data.payload?.reason || '自动重试'}`, data.timestamp);
      break;
    }

    case 'LOG': {
      addLog(data.payload?.level || 'info', data.payload?.message || '', data.timestamp);
      break;
    }

    case 'RUN_FINISHED': {
      // ① 状态映射：SUCCESS / FAILED / TERMINATED 三态（终止的 run 不再错标 FAILED）
      const rawStatus = String(data.payload?.status || '').toUpperCase();
      const finalStatus = rawStatus === 'TERMINATED' ? 'TERMINATED' : (rawStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED');
      currentRun.value.status = finalStatus;
      // ② 耗时：后端键名为 durationMs（历史遗留代码误读 duration，两键都兼容）
      const finalDuration = Number(data.payload?.durationMs ?? data.payload?.duration) || 0;
      if (finalDuration > 0) {
        currentRun.value.durationMs = finalDuration;
      }
      runFinished.value = true;
      wsStatus.value = '已完成';

      updateRunInStore(
        currentRun.value.id,
        currentRun.value.status,
        currentRun.value.durationMs,
        totalTokensUsed.value
      );

      addLog(
        finalStatus === 'SUCCESS' ? 'info' : (finalStatus === 'TERMINATED' ? 'warn' : 'error'),
        `工作流${finalStatus === 'SUCCESS' ? '执行完成' : (finalStatus === 'TERMINATED' ? '执行被终止' : '执行失败')}，耗时: ${formatDuration(currentRun.value.durationMs || finalDuration)}`,
        data.timestamp
      );
      disconnect();
      break;
    }

    case 'REPLAY_RESULT': {
      if (data.payload?.replayedCount > 0) {
        addLog('info', `断线重连，已补发 ${data.payload.replayedCount} 条事件`, data.timestamp);
      }
      break;
    }

    case 'HEARTBEAT_ACK':
      break;
  }
}

function reconnect(runId: number | string, token: string) {
  if (runFinished.value) return;
  connectWebSocket(runId, token);
}

function disconnect() {
  if (heartbeatTimer.value) {
    clearInterval(heartbeatTimer.value);
    heartbeatTimer.value = null;
  }
  if (reconnectTimer.value) {
    clearTimeout(reconnectTimer.value);
    reconnectTimer.value = null;
  }
  if (ws.value) {
    ws.value.onclose = null;
    ws.value.close();
    ws.value = null;
  }
}

function loadHistoryData() {
  if (!currentRun.value) return;

  const nodeRuns = currentRun.value.nodeRuns || currentRun.value.nodeStates || [];
  for (const nodeRun of nodeRuns) {
    const key = nodeRun.nodeKey || nodeRun.nodeId || 'node-1';

    // 节点状态
    nodeStatuses[key] = (nodeRun.status || 'PENDING').toUpperCase();

    // 节点输出
    if (nodeRun.output) {
      nodeOutputs[key] = typeof nodeRun.output === 'object'
        ? JSON.stringify(nodeRun.output, null, 2)
        : String(nodeRun.output);
    } else if (nodeRun.outputJson) {
      nodeOutputs[key] = typeof nodeRun.outputJson === 'object'
        ? JSON.stringify(nodeRun.outputJson, null, 2)
        : String(nodeRun.outputJson);
    }

    // 节点输入
    if (nodeRun.input) {
      nodeInputs[key] = typeof nodeRun.input === 'object'
        ? JSON.stringify(nodeRun.input, null, 2)
        : String(nodeRun.input);
    } else if (nodeRun.inputJson) {
      nodeInputs[key] = typeof nodeRun.inputJson === 'object'
        ? JSON.stringify(nodeRun.inputJson, null, 2)
        : String(nodeRun.inputJson);
    }

    // Token 用量及性能指标
    if (nodeRun.tokensUsed && typeof nodeRun.tokensUsed === 'object') {
      const tu = nodeRun.tokensUsed;
      nodeTokens[key] = tu.totalTokens || tu.total_tokens || 0;
      if (tu.first_token_ms) nodeFirstTokenMs[key] = Number(tu.first_token_ms);
      if (tu.llm_rounds) nodeLlmRounds[key] = Number(tu.llm_rounds);
      if (tu.tool_time_ms) nodeToolTimeMs[key] = Number(tu.tool_time_ms);
    } else if (nodeRun.tokensUsed) {
      nodeTokens[key] = Number(nodeRun.tokensUsed);
    } else if (nodeRun.tokens) {
      nodeTokens[key] = nodeRun.tokens;
    }

    // 耗时
    if (nodeRun.durationMs) {
      nodeDurations[key] = nodeRun.durationMs;
    } else if (nodeRun.startedAt && nodeRun.finishedAt) {
      const start = new Date(nodeRun.startedAt).getTime();
      const end = new Date(nodeRun.finishedAt).getTime();
      nodeDurations[key] = Math.max(0, end - start);
    }

    // 错误信息
    if (nodeRun.errorMsg || nodeRun.error) {
      nodeErrors[key] = nodeRun.errorMsg || nodeRun.error;
    }

    // 日志：工具调用记录
    if (Array.isArray(nodeRun.toolCalls)) {
      for (const tc of nodeRun.toolCalls) {
        addLog(
          'info',
          `工具调用: ${tc.toolName || tc.name || 'tool'}(${typeof tc.args === 'object' ? JSON.stringify(tc.args) : (tc.args || '')})`,
          nodeRun.startedAt
        );
      }
    }

    // 日志：节点完成/失败/终止
    if (nodeStatuses[key] === 'SUCCESS') {
      addLog(
        'info',
        `节点 ${key} 完成，Token: ${nodeTokens[key] || 0}`,
        nodeRun.finishedAt || nodeRun.startedAt
      );
    } else if (nodeStatuses[key] === 'FAILED') {
      addLog(
        'error',
        `节点 ${key} 失败: ${nodeRun.errorMsg || nodeRun.error || '执行报错'}`,
        nodeRun.finishedAt || nodeRun.startedAt
      );
    } else if (nodeStatuses[key] === 'TERMINATED') {
      addLog(
        'warn',
        `节点 ${key} 已终止: ${nodeRun.errorMsg || nodeRun.error || '执行被用户终止'}`,
        nodeRun.finishedAt || nodeRun.startedAt
      );
    }
  }

  // 工作流级日志
  const st = (currentRun.value.status || '').toUpperCase();
  if (st === 'SUCCESS') {
    addLog(
      'info',
      `工作流执行完成，总耗时: ${currentRun.value.durationMs || 0}ms`,
      currentRun.value.finishedAt
    );
  } else if (st === 'FAILED') {
    addLog(
      'error',
      `工作流执行失败: ${currentRun.value.errorMsg || '未知错误'}`,
      currentRun.value.finishedAt
    );
  } else if (st === 'TERMINATED') {
    addLog(
      'warn',
      `工作流已被终止`,
      currentRun.value.finishedAt
    );
    // 兜底扫尾：节点级终止事件可能因断线丢失，run 级终止时统一收口
    for (const key of Object.keys(nodeStatuses)) {
      if (nodeStatuses[key] === 'RUNNING' || nodeStatuses[key] === 'PENDING') {
        nodeStatuses[key] = 'TERMINATED';
      }
    }
  }

  // 默认选中最后一个有输出的节点
  const lastWithOutput = [...nodeRuns].reverse().find((n: any) => n.output || n.outputJson);
  if (lastWithOutput) {
    selectedOutputNodeKey.value = lastWithOutput.nodeKey || lastWithOutput.nodeId;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isModalOpen.value) {
    closeModal();
  }
}

// Initialization Lifecycle
onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);

  const runId = state.selectedRunId || (state.runs[0] ? state.runs[0].id : null);
  if (!runId) {
    isFetchingRun.value = false;
    return;
  }

  // 1. 同步尝试从 AppStore 全局状态直接读取（消除白屏与卡顿感）
  const localFound = state.runs.find((r) => String(r.id) === String(runId));
  if (localFound) {
    currentRun.value = { ...localFound };
    isFetchingRun.value = false;
    if (nodeList.value.length > 0 && !selectedNodeKey.value) {
      selectedNodeKey.value = nodeList.value[0].nodeKey;
    }
    if ((currentRun.value.status || '').toUpperCase() !== 'RUNNING') {
      loadHistoryData();
    }
  } else {
    isFetchingRun.value = true;
  }

  // 2. 异步请求后端 API 获取完整单据与 nodeRuns 链路明细
  try {
    const rawData = await api.getRun(runId);
    if (rawData) {
      const mapped = mapRunDtoToRunRecord ? mapRunDtoToRunRecord(rawData) : rawData;
      if (rawData.nodeRuns) {
        mapped.nodeRuns = rawData.nodeRuns;
      }
      currentRun.value = mapped;
      updateRunInStore(mapped.id, mapped.status, mapped.durationMs, mapped.tokensUsed);
    }
  } catch (err) {
    console.warn('后端获取执行单据失败，使用本地状态:', err);
  } finally {
    isFetchingRun.value = false;
  }

  if (!currentRun.value) {
    wsStatus.value = '加载失败';
    return;
  }

  // 加载只读工作流拓扑结构
  loadWorkflowTopology();

  // Initialize node states map & select first node
  if (nodeList.value.length > 0 && !selectedNodeKey.value) {
    selectedNodeKey.value = nodeList.value[0].nodeKey;
  }

  // 3. Decide behavior according to run status
  const currentStatus = (currentRun.value.status || '').toUpperCase();
  if (currentStatus === 'RUNNING') {
    // 运行中：重置序号缓存并建立 WebSocket 实时连接
    lastEventSeq.value = 0;
    seenSeq.clear();
    wsStatus.value = '连接中...';
    const token = tokenManager.getAccessToken() || 'mock-jwt-token';
    if (token && runId) {
      connectWebSocket(runId, token);
    }
  } else {
    // 已结束 (SUCCESS / FAILED / TERMINATED / PENDING etc.)：不建立 WebSocket
    wsStatus.value = '已结束';
    loadHistoryData();
    updateRunInStore(currentRun.value.id, currentStatus, currentRun.value.durationMs, currentRun.value.tokensUsed);
  }
});

onUnmounted(() => {
  disconnect();
  if (elapsedTimer != null) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
  if (chunkFlushRaf !== null) {
    cancelAnimationFrame(chunkFlushRaf);
    chunkFlushRaf = null;
  }
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
@keyframes dag-pulse {
  0%, 100% { stroke-opacity: 1; }
  50% { stroke-opacity: 0.3; }
}
.dag-node-running {
  animation: dag-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

:deep(.md-body) {
  color: #e2e8f0;
  line-height: 1.6;
  font-family: inherit;
}
:deep(.md-body h1), :deep(.md-body h2), :deep(.md-body h3) {
  color: #f8fafc;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}
:deep(.md-body h1) { font-size: 1.25rem; }
:deep(.md-body h2) { font-size: 1.1rem; }
:deep(.md-body h3) { font-size: 0.95rem; }
:deep(.md-body p) { margin-bottom: 0.75rem; }
:deep(.md-body ul), :deep(.md-body ol) {
  margin-left: 1.25rem;
  margin-bottom: 0.75rem;
}
:deep(.md-body ul) { list-style-type: disc; }
:deep(.md-body ol) { list-style-type: decimal; }
:deep(.md-body li) { margin-bottom: 0.25rem; }
:deep(.md-body code) {
  background-color: #0f172a;
  color: #6ee7b7;
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
  font-family: ui-monospace, monospace;
}
:deep(.md-body pre) {
  background-color: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  overflow-x: auto;
}
:deep(.md-body pre code) {
  background: transparent;
  padding: 0;
  color: #a7f3d0;
}
:deep(.md-body blockquote) {
  border-left: 3px solid #6366f1;
  padding-left: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}
:deep(.md-body a) {
  color: #818cf8;
  text-decoration: underline;
}
:deep(.md-body table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
}
:deep(.md-body th), :deep(.md-body td) {
  border: 1px solid #334155;
  padding: 0.4rem 0.6rem;
  text-align: left;
}
:deep(.md-body th) {
  background-color: #1e293b;
  color: #f8fafc;
}
</style>
