<template>
  <div class="h-[calc(100vh-3.5rem)] flex flex-col bg-slate-900 text-slate-100 overflow-hidden relative">
    <!-- Loading Overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3"
    >
      <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-slate-300 font-medium">正在获取完整 DAG 节点与有向拓扑链路...</p>
    </div>

    <!-- Empty State View when no workflow exists -->
    <div
      v-if="!currentWf && !loading"
      class="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 bg-slate-950"
    >
      <div class="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-xl">
        <WorkflowIcon class="w-8 h-8 text-indigo-400" />
      </div>
      <div class="space-y-1.5 max-w-md">
        <h3 class="text-base font-bold text-white">全新 DAG 工作流画布</h3>
        <p class="text-xs text-slate-400">目前尚未选中特定工作流。您可以快速创建一个全新的 DAG 工作流，或选择已有工作流载入拓扑。</p>
      </div>

      <!-- Quick select existing workflow dropdown if workflows exist -->
      <div v-if="state.workflows.length > 0" class="w-full max-w-xs space-y-1.5">
        <label class="block text-[11px] font-semibold text-slate-400">载入已有工作流</label>
        <select
          @change="onSelectWorkflowFromEmptyState"
          class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">-- 选择已有工作流模板 --</option>
          <option v-for="wf in state.workflows" :key="wf.id" :value="wf.id">
            {{ wf.name }} ({{ wf.nodeCount ?? wf.nodes?.length ?? 0 }} 算子)
          </option>
        </select>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button
          @click="setRoute('workflows')"
          class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          返回工作流列表
        </button>
        <button
          @click="createNewWorkflowInEditor"
          class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>创建新工作流</span>
        </button>
      </div>
    </div>

    <!-- Active Canvas Editor View -->
    <template v-else-if="currentWf">
      <!-- Top Canvas Toolbar -->
      <div class="h-14 border-b border-slate-800 bg-slate-950/80 px-6 flex items-center justify-between shrink-0 z-30">
        <div class="flex items-center gap-4">
          <button
            @click="setRoute('workflows')"
            title="返回列表"
            class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>

          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <input
                v-model="currentWf.name"
                type="text"
                placeholder="工作流名称"
                class="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1"
              />
              <span
                class="text-[10px] px-2.5 py-0.5 rounded-full font-bold cursor-pointer select-none transition-colors"
                :class="currentWf.status === 'published' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'"
                @click="togglePublishStatus"
                :title="currentWf.status === 'published' ? '点击切换为草稿 (DRAFT) 允许修改' : '点击切换为上线 (PUBLISHED)'"
              >
                {{ currentWf.status === 'published' ? '已上线 (PUBLISHED)' : '草稿 (DRAFT)' }}
              </span>
            </div>
            <p class="text-[10px] text-slate-400 px-1">
              ID: {{ currentWf.id }} · {{ currentWf.nodes?.length || 0 }} 算子节点 · {{ currentWf.edges?.length || 0 }} 有向边
            </p>
          </div>
        </div>

        <!-- Action Toolbar -->
        <div class="flex items-center gap-2">
          <button
            @click="addAgentNode"
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Bot class="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Agent 算子</span>
          </button>

          <button
            @click="addToolNode"
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Server class="w-3.5 h-3.5 text-amber-400" />
            <span>+ MCP 工具</span>
          </button>

          <button
            @click="addConditionNode"
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Split class="w-3.5 h-3.5 text-cyan-400" />
            <span>+ 条件分支</span>
          </button>

          <div class="h-4 w-px bg-slate-800 mx-1"></div>

          <button
            @click="saveCanvas"
            :disabled="saving"
            class="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <Save class="w-3.5 h-3.5" />
            <span>{{ saving ? '保存中...' : '保存 DAG' }}</span>
          </button>

          <button
            @click="handleRun"
            class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
            <span>立即调度运行</span>
          </button>

          <button
            @click="handleDeleteWorkflow"
            title="删除工作流"
            class="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-colors cursor-pointer"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Canvas Main Container -->
      <div class="flex-1 flex relative overflow-hidden">
        <!-- Left Node Palette Drawer -->
        <div class="w-64 border-r border-slate-800 bg-slate-950/60 p-4 space-y-4 overflow-y-auto shrink-0 select-none">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">算子拖拽 / 快捷组件库</div>

          <!-- System Triggers -->
          <div class="space-y-2">
            <div class="text-[10px] font-medium text-slate-500">基础触发器与终点</div>
            <button
              @click="addStartNode"
              class="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 text-left transition-colors flex items-center gap-2 text-xs cursor-pointer"
            >
              <div class="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
              <span>Webhook / API 触发器</span>
            </button>
            <button
              @click="addEndNode"
              class="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 text-left transition-colors flex items-center gap-2 text-xs cursor-pointer"
            >
              <div class="w-3 h-3 rounded-full bg-rose-500 shrink-0"></div>
              <span>终点与结构化输出</span>
            </button>
            <button
              @click="addConditionNode"
              class="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 text-left transition-colors flex items-center gap-2 text-xs cursor-pointer"
            >
              <div class="w-3 h-3 rounded-full bg-cyan-500 shrink-0"></div>
              <span>条件逻辑判断节点</span>
            </button>
          </div>

          <!-- Available Agents -->
          <div class="space-y-2 pt-2">
            <div class="text-[10px] font-medium text-slate-500">Agent 智能体库</div>
            <div
              v-for="ag in state.agents"
              :key="ag.id"
              @click="addSpecificAgentNode(ag)"
              class="p-2.5 rounded-xl border border-indigo-900/40 bg-indigo-950/20 hover:bg-indigo-900/30 cursor-pointer transition-colors space-y-1"
            >
              <div class="flex items-center justify-between text-xs font-semibold text-indigo-200">
                <span class="truncate max-w-[140px]">{{ ag.name }}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300">{{ ag.type }}</span>
              </div>
              <p class="text-[10px] text-slate-400 line-clamp-1">{{ ag.description }}</p>
            </div>
            <p v-if="state.agents.length === 0" class="text-[11px] text-slate-500 italic">暂无可选 Agent</p>
          </div>

          <!-- Connected MCP Tools -->
          <div class="space-y-2 pt-2">
            <div class="text-[10px] font-medium text-slate-500">已就绪 MCP 工具</div>
            <div
              v-for="mcp in state.mcpServers"
              :key="mcp.id"
              class="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1.5"
            >
              <div class="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>{{ mcp.name }}</span>
                <span class="text-[9px] text-emerald-400">已连接</span>
              </div>
              <div class="space-y-1">
                <div
                  v-for="tool in mcp.tools"
                  :key="tool.id"
                  @click="addSpecificToolNode(tool.name)"
                  class="text-[10px] p-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Zap class="w-3 h-3 text-amber-400 shrink-0" />
                  <span class="truncate">{{ tool.name }}</span>
                </div>
              </div>
            </div>
            <p v-if="state.mcpServers.length === 0" class="text-[11px] text-slate-500 italic">暂无 MCP 探针服务</p>
          </div>
        </div>

        <!-- Center DAG Interactive Stage -->
        <div
          class="flex-1 bg-slate-900/90 relative overflow-hidden cursor-crosshair select-none"
          style="background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 24px 24px;"
          @click="selectedNodeId = null"
        >
          <!-- SVG Edges Connection Layer -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none z-10">
            <g v-for="edge in currentWf.edges" :key="edge.id">
              <path
                :d="getEdgePath(edge)"
                fill="none"
                stroke="#6366f1"
                stroke-width="2"
                stroke-dasharray="4"
                class="animate-[dash_20s_linear_infinite]"
              />
            </g>
          </svg>

          <!-- Node Render Layer -->
          <div
            v-for="node in currentWf.nodes"
            :key="node.id"
            class="absolute z-20 cursor-move"
            :style="{ left: node.position.x + 'px', top: node.position.y + 'px' }"
            @click.stop="selectedNodeId = node.id"
            @mousedown="startDragNode($event, node)"
          >
            <div
              class="w-64 rounded-2xl p-4 border shadow-xl backdrop-blur-md transition-all space-y-2"
              :class="
                selectedNodeId === node.id
                  ? 'border-indigo-500 bg-slate-800 ring-2 ring-indigo-500/50 shadow-indigo-500/10'
                  : node.type === 'startNode'
                  ? 'border-emerald-500/40 bg-emerald-950/20'
                  : node.type === 'endNode'
                  ? 'border-rose-500/40 bg-rose-950/20'
                  : node.type === 'toolNode'
                  ? 'border-amber-500/40 bg-amber-950/20'
                  : node.type === 'conditionNode'
                  ? 'border-cyan-500/40 bg-cyan-950/20'
                  : 'border-slate-700 bg-slate-800/90 hover:border-slate-600'
              "
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div
                    class="w-3 h-3 rounded-full shrink-0"
                    :class="
                      node.type === 'startNode'
                        ? 'bg-emerald-500'
                        : node.type === 'endNode'
                        ? 'bg-rose-500'
                        : node.type === 'toolNode'
                        ? 'bg-amber-500'
                        : node.type === 'conditionNode'
                        ? 'bg-cyan-500'
                        : 'bg-indigo-500'
                    "
                  ></div>
                  <span class="font-bold text-xs text-white truncate max-w-[150px]">{{ node.data.label }}</span>
                </div>
                <button
                  @click.stop="removeNode(node.id)"
                  class="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <div v-if="node.type === 'agentNode'" class="text-[10px] space-y-1 text-slate-400 pt-1 border-t border-slate-700/60">
                <div class="flex justify-between">
                  <span>绑定 Agent:</span>
                  <span class="text-indigo-300 font-medium">{{ node.data.agentName || '默认 Agent' }}</span>
                </div>
                <div class="flex justify-between">
                  <span>LLM 模型:</span>
                  <span class="text-slate-200">{{ node.data.llmModel || 'qwen-max' }}</span>
                </div>
              </div>

              <div v-else-if="node.type === 'conditionNode'" class="text-[10px] text-slate-400 pt-1 border-t border-slate-700/60">
                <span>分支逻辑节点</span>
              </div>

              <!-- Edge Connection Handles -->
              <div class="flex justify-between items-center text-[9px] text-slate-500 pt-1 border-t border-slate-800/50">
                <span class="text-slate-400 font-mono">In</span>
                <span class="text-indigo-400 font-mono font-semibold">{{ node.id }}</span>
                <span class="text-slate-400 font-mono">Out</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Node Configuration Inspector Drawer -->
        <div
          v-if="selectedNode"
          class="w-80 border-l border-slate-800 bg-slate-950/90 p-5 space-y-5 overflow-y-auto shrink-0 z-30"
        >
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <Sliders class="w-4 h-4 text-indigo-400" />
              <h3 class="font-bold text-xs text-white">节点属性配置 (Node Inspector)</h3>
            </div>
            <button @click="selectedNodeId = null" class="text-slate-400 hover:text-white">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-4 text-xs">
            <div>
              <label class="block text-slate-400 font-medium mb-1">算子标签名称</label>
              <input
                v-model="selectedNode.data.label"
                type="text"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div v-if="selectedNode.type === 'agentNode'" class="space-y-4">
              <div>
                <label class="block text-slate-400 font-medium mb-1">选择绑定 Agent 智能体</label>
                <select
                  v-model="selectedNode.data.agentId"
                  @change="onAgentSelectChange"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option v-for="ag in state.agents" :key="ag.id" :value="ag.id">
                    {{ ag.name }} ({{ ag.llmProviderName }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-slate-400 font-medium mb-1">覆写 System Prompt 提示词</label>
                <textarea
                  v-model="selectedNode.data.systemPromptOverride"
                  rows="4"
                  placeholder="若不指定，将默认采用 Agent 原生的全局 System Prompt..."
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[11px]"
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-400 font-medium mb-1">超时阈值 (s)</label>
                  <input
                    v-model.number="selectedNode.data.timeoutSeconds"
                    type="number"
                    class="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label class="block text-slate-400 font-medium mb-1">重试次数</label>
                  <input
                    v-model.number="selectedNode.data.retries"
                    type="number"
                    class="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <!-- Connect to other nodes -->
            <div class="pt-3 border-t border-slate-800 space-y-2">
              <label class="block text-slate-400 font-medium flex items-center justify-between">
                <span>添加下游连接链路 (Directed Edge)</span>
                <Link class="w-3.5 h-3.5 text-indigo-400" />
              </label>
              <div class="flex items-center gap-2">
                <select
                  v-model="connectTargetId"
                  class="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none text-xs"
                >
                  <option value="">-- 选择目标节点 --</option>
                  <option
                    v-for="n in availableTargetNodes"
                    :key="n.id"
                    :value="n.id"
                  >
                    {{ n.data.label }} ({{ n.id }})
                  </option>
                </select>
                <button
                  @click="addConnectionToTarget"
                  :disabled="!connectTargetId"
                  class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  连接
                </button>
              </div>
            </div>

            <!-- Outgoing Edges List -->
            <div v-if="outgoingEdges.length > 0" class="space-y-1.5 pt-2">
              <div class="text-[11px] font-semibold text-slate-400">已建立的输出连线:</div>
              <div
                v-for="edge in outgoingEdges"
                :key="edge.id"
                class="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]"
              >
                <span class="text-indigo-300 font-mono">&rarr; {{ edge.target }}</span>
                <button @click="removeEdge(edge.id)" class="text-slate-500 hover:text-rose-400">
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-slate-400 font-medium mb-1">节点 Key (nodeKey)</label>
              <input
                :value="selectedNode.id"
                disabled
                class="w-full px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-500 text-[11px]"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Execution Input Modal -->
    <RunInputDialog
      :is-open="runDialogOpen"
      :workflow="currentWf"
      @close="runDialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  ArrowLeft,
  Bot,
  Server,
  Save,
  Play,
  Zap,
  X,
  Sliders,
  Workflow as WorkflowIcon,
  Plus,
  Trash2,
  Split,
  Link,
} from 'lucide-vue-next';
import { api, mapWorkflowDtoToWorkflow } from '../../api';
import { useAppStore, addWorkflow, updateWorkflow, deleteWorkflow, addToast } from '../../stores/useAppStore';
import RunInputDialog from '../common/RunInputDialog.vue';
import { DAGNode, Workflow as WorkflowType } from '../../types';

const { state, setRoute } = useAppStore();

const loading = ref(false);
const saving = ref(false);
const runDialogOpen = ref(false);
const currentWf = ref<WorkflowType | null>(null);
const selectedNodeId = ref<string | null>(null);
const connectTargetId = ref<string>('');

const selectedNode = computed(() => {
  if (!selectedNodeId.value || !currentWf.value) return null;
  return currentWf.value.nodes.find((n) => n.id === selectedNodeId.value) || null;
});

const availableTargetNodes = computed(() => {
  if (!selectedNode.value || !currentWf.value) return [];
  return currentWf.value.nodes.filter((n) => n.id !== selectedNode.value?.id);
});

const outgoingEdges = computed(() => {
  if (!selectedNode.value || !currentWf.value) return [];
  return currentWf.value.edges.filter((e) => e.source === selectedNode.value?.id);
});

async function loadWorkflowDetail(id: string) {
  if (!id) return;
  loading.value = true;
  try {
    const dto = await api.getWorkflow(id);
    if (dto) {
      currentWf.value = mapWorkflowDtoToWorkflow(dto);
      // Hydrate agent metadata for agent nodes
      if (currentWf.value && currentWf.value.nodes) {
        currentWf.value.nodes.forEach((n) => {
          if (n.type === 'agentNode' && n.data.agentId) {
            const ag = state.agents.find((a) => String(a.id) === String(n.data.agentId));
            if (ag) {
              n.data.agentName = ag.name;
              n.data.llmModel = ag.model;
            }
          }
        });
      }
    } else {
      currentWf.value = null;
    }
  } catch (err: any) {
    addToast({ type: 'error', title: '加载工作流画布失败', message: err.message || '无法获取工作流拓扑详情' });
    currentWf.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  () => state.selectedWorkflowId,
  (newId) => {
    if (newId) {
      loadWorkflowDetail(newId);
    } else {
      currentWf.value = null;
    }
  },
  { immediate: true }
);

function onSelectWorkflowFromEmptyState(e: Event) {
  const target = e.target as HTMLSelectElement;
  if (target.value) {
    state.selectedWorkflowId = target.value;
  }
}

async function createNewWorkflowInEditor() {
  const newWf = await addWorkflow({
    name: '新建 DAG 工作流',
    description: '通过 DAG 可视化画布创建的工作流模板',
    status: 'draft',
    isPublic: false,
    nodes: [
      {
        id: 'node-start-1',
        type: 'startNode',
        position: { x: 120, y: 180 },
        data: { label: 'Webhook HTTP 触发器' },
      },
      {
        id: 'node-end-1',
        type: 'endNode',
        position: { x: 650, y: 180 },
        data: { label: '结构化 JSON 响应' },
      },
    ],
    edges: [],
  });
  if (newWf) {
    state.selectedWorkflowId = newWf.id;
    await loadWorkflowDetail(newWf.id);
  }
}

function togglePublishStatus() {
  if (!currentWf.value) return;
  currentWf.value.status = currentWf.value.status === 'published' ? 'draft' : 'published';
}

async function saveCanvas() {
  if (!currentWf.value) return;

  if (currentWf.value.status === 'published') {
    addToast({
      type: 'warning',
      title: '当前工作流处于已上线 (PUBLISHED) 状态',
      message: '注意：已上线工作流不可直接保存修改。请在页面上方将状态切换为【草稿 (DRAFT)】后再保存。',
    });
    return;
  }

  saving.value = true;
  try {
    const res = await updateWorkflow(currentWf.value.id, {
      name: currentWf.value.name,
      description: currentWf.value.description,
      status: currentWf.value.status,
      nodes: currentWf.value.nodes,
      edges: currentWf.value.edges,
    });
    if (res) {
      currentWf.value = res;
    }
  } finally {
    saving.value = false;
  }
}

async function handleDeleteWorkflow() {
  if (!currentWf.value) return;
  if (confirm(`确定要删除工作流「${currentWf.value.name}」吗？`)) {
    await deleteWorkflow(currentWf.value.id);
    setRoute('workflows');
  }
}

async function handleRun() {
  if (!currentWf.value) return;
  if (currentWf.value.status === 'draft') {
    await saveCanvas();
  }
  runDialogOpen.value = true;
}

function addStartNode() {
  if (!currentWf.value) return;
  const id = `node-start-${Date.now().toString().slice(-4)}`;
  currentWf.value.nodes.push({
    id,
    type: 'startNode',
    position: { x: 120, y: 150 + (currentWf.value.nodes.length % 5) * 30 },
    data: { label: '自定义 HTTP 触发器' },
  });
}

function addEndNode() {
  if (!currentWf.value) return;
  const id = `node-end-${Date.now().toString().slice(-4)}`;
  currentWf.value.nodes.push({
    id,
    type: 'endNode',
    position: { x: 650, y: 150 + (currentWf.value.nodes.length % 5) * 30 },
    data: { label: '结构化 JSON 响应' },
  });
}

function addConditionNode() {
  if (!currentWf.value) return;
  const id = `node-cond-${Date.now().toString().slice(-4)}`;
  currentWf.value.nodes.push({
    id,
    type: 'conditionNode',
    position: { x: 400, y: 180 },
    data: { label: '条件分支逻辑判断' },
  });
}

function addAgentNode() {
  const ag = state.agents[0];
  if (ag) addSpecificAgentNode(ag);
  else addSpecificAgentNode({ name: '通义千问 Agent', type: 'ReAct', id: '1' });
}

function addSpecificAgentNode(ag: any) {
  if (!currentWf.value) return;
  const id = `node-agent-${Date.now().toString().slice(-4)}`;
  const newNode: DAGNode = {
    id,
    type: 'agentNode',
    position: { x: 320, y: 150 + (currentWf.value.nodes.length % 5) * 25 },
    data: {
      label: ag.name,
      agentId: String(ag.id),
      agentName: ag.name,
      agentType: ag.type,
      llmModel: ag.model || 'qwen-max',
      timeoutSeconds: ag.timeout || 30,
      retries: ag.maxRetries || 3,
    },
  };
  currentWf.value.nodes.push(newNode);

  // Auto connect to startNode if available
  const startNode = currentWf.value.nodes.find((n) => n.type === 'startNode');
  if (startNode) {
    currentWf.value.edges.push({
      id: `${startNode.id}-${id}`,
      source: startNode.id,
      target: id,
    });
  }
}

function addToolNode() {
  addSpecificToolNode('MCP 通用工具算子');
}

function addSpecificToolNode(name: string) {
  if (!currentWf.value) return;
  const id = `node-tool-${Date.now().toString().slice(-4)}`;
  currentWf.value.nodes.push({
    id,
    type: 'toolNode',
    position: { x: 480, y: 180 },
    data: { label: name },
  });
}

function removeNode(id: string) {
  if (!currentWf.value) return;
  currentWf.value.nodes = currentWf.value.nodes.filter((n) => n.id !== id);
  currentWf.value.edges = currentWf.value.edges.filter((e) => e.source !== id && e.target !== id);
  if (selectedNodeId.value === id) selectedNodeId.value = null;
}

function addConnectionToTarget() {
  if (!selectedNode.value || !connectTargetId.value || !currentWf.value) return;
  const source = selectedNode.value.id;
  const target = connectTargetId.value;
  const existing = currentWf.value.edges.find((e) => e.source === source && e.target === target);
  if (!existing) {
    currentWf.value.edges.push({
      id: `${source}-${target}`,
      source,
      target,
    });
  }
  connectTargetId.value = '';
}

function removeEdge(edgeId: string) {
  if (!currentWf.value) return;
  currentWf.value.edges = currentWf.value.edges.filter((e) => e.id !== edgeId);
}

function onAgentSelectChange() {
  if (selectedNode.value && selectedNode.value.data.agentId) {
    const ag = state.agents.find((a) => String(a.id) === String(selectedNode.value?.data.agentId));
    if (ag) {
      selectedNode.value.data.agentName = ag.name;
      selectedNode.value.data.llmModel = ag.model;
      selectedNode.value.data.label = ag.name;
    }
  }
}

function getEdgePath(edge: any) {
  if (!currentWf.value) return '';
  const sourceNode = currentWf.value.nodes.find((n) => n.id === edge.source);
  const targetNode = currentWf.value.nodes.find((n) => n.id === edge.target);
  if (!sourceNode || !targetNode) return '';

  const sx = sourceNode.position.x + 256;
  const sy = sourceNode.position.y + 40;
  const tx = targetNode.position.x;
  const ty = targetNode.position.y + 40;

  const dx = Math.abs(tx - sx) / 2;
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}

// Drag node handling
let draggingNode: DAGNode | null = null;
let startX = 0;
let startY = 0;

function startDragNode(e: MouseEvent, node: DAGNode) {
  draggingNode = node;
  startX = e.clientX - node.position.x;
  startY = e.clientY - node.position.y;

  const onMouseMove = (ev: MouseEvent) => {
    if (draggingNode) {
      draggingNode.position.x = Math.max(20, ev.clientX - startX);
      draggingNode.position.y = Math.max(20, ev.clientY - startY);
    }
  };

  const onMouseUp = () => {
    draggingNode = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}
</script>

<style scoped>
@keyframes dash {
  to {
    stroke-dashoffset: -100;
  }
}
</style>
