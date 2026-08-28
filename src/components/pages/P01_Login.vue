<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden selection:bg-indigo-600 selection:text-white">
    <!-- Clean Structural Grid Background -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none"></div>

    <!-- Main Container Card -->
    <div class="w-full max-w-6xl bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12">
      <!-- Left Panel: Platform Architecture & Capabilities -->
      <div class="lg:col-span-7 p-8 lg:p-12 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-200/80 flex flex-col justify-between space-y-8">
        <div class="space-y-6">
          <!-- Logo & Platform Identity -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
              AF
            </div>
            <div>
              <h1 class="text-xl font-bold text-slate-900 tracking-tight leading-none">AgentForge</h1>
              <p class="text-xs text-slate-500 mt-1 font-medium">企业级多智能体协同调度引擎</p>
            </div>
          </div>

          <!-- Hero Slogan -->
          <div class="space-y-3 pt-2">
            <div class="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-3 py-1 rounded-full text-xs font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>v2.4.0 私有化集群已就绪</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              自托管多智能体 <br />
              <span class="text-indigo-600">DAG 拓扑编排与 MCP 工具调度</span>
            </h2>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
               AgentForge 为企业级智能化搭建可视化有向无环图 (DAG) 算子流，打通 Anthropic/OpenAI MCP 开放扩展协议，提供毫秒级推流日志审计与细粒度 RBAC 权限判定。
            </p>
          </div>

          <!-- 4 Core Features Cards (Light High-Contrast) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div
              v-for="feature in features"
              :key="feature.title"
              class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-2"
            >
              <div class="flex items-center gap-2.5">
                <div class="p-2 rounded-xl bg-slate-100 text-slate-900 font-bold">
                  <component :is="feature.icon" class="w-4 h-4 text-indigo-600" />
                </div>
                <h3 class="font-bold text-xs sm:text-sm text-slate-900">{{ feature.title }}</h3>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed">{{ feature.description }}</p>
            </div>
          </div>
        </div>

        <!-- System Health Footer Bar -->
        <div class="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-sans text-slate-700 font-medium">节点状态: <strong class="text-slate-900">Health 100%</strong></span>
          </div>
          <div class="flex items-center gap-4 text-[11px] text-slate-500">
            <span>MCP SSE 响应: &lt;12ms</span>
            <span>并发算子: 512 Pipeline</span>
          </div>
        </div>
      </div>

      <!-- Right Panel: Login Form & Quick User Selector -->
      <div class="lg:col-span-5 p-8 lg:p-12 flex flex-col justify-center bg-white space-y-6">
        <div class="space-y-1.5">
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">登录 AgentForge 控制台</h2>
          <p class="text-xs text-slate-500">输入您的账号凭证进入工作流调度与 Agent 管理中心</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">用户名 / 账号</label>
            <div class="relative">
              <UserIcon class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                v-model="username"
                type="text"
                required
                class="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="请输入用户名 (例: admin)"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">密码 / 登录凭证</label>
            <div class="relative">
              <Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                v-model="password"
                type="password"
                required
                class="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span v-if="!isLoading">进入 AgentForge 系统</span>
            <span v-else class="flex items-center gap-2">
              <Loader2 class="w-4 h-4 animate-spin" />
              <span>验证鉴权数据...</span>
            </span>
            <ArrowRight v-if="!isLoading" class="w-4 h-4" />
          </button>
        </form>



        <div class="text-center text-[11px] text-slate-400 space-y-1">
          <p>私有部署保护 · 结构化推流日志 · 全链路操作行为审计</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { User as UserIcon, Lock, ArrowRight, Loader2, GitFork, Server, Bot, ShieldCheck } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';

const { handleLoginApi } = useAppStore();

const username = ref('');
const password = ref('');
const isLoading = ref(false);

const features = [
  {
    title: 'DAG 画布可视化编排',
    description: '低代码节点联动，支持条件分支与并发节点推流。',
    icon: GitFork,
  },
  {
    title: 'MCP 扩展协议扩展池',
    description: '原生对接 PostgreSQL, GitHub, File System 探针。',
    icon: Server,
  },
  {
    title: '特化 Agent 智能体池',
    description: '配置 ReAct 角色指令、温度采样与工具授权白名单。',
    icon: Bot,
  },
  {
    title: 'RBAC 矩阵与安全审计',
    description: '严格划分 Admin、Developer、Auditor 权限边界。',
    icon: ShieldCheck,
  },
];

async function handleLogin() {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    await handleLoginApi(username.value, password.value);
  } finally {
    isLoading.value = false;
  }
}
</script>
