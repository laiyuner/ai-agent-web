<template>
  <header class="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2.5 cursor-pointer" @click="setRoute('dashboard')">
        <div class="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold text-base flex items-center justify-center shadow-md">
          AF
        </div>
        <div>
          <h1 class="font-bold text-slate-900 text-base tracking-tight leading-none">AgentForge</h1>
          <p class="text-xs text-slate-500 font-medium mt-0.5">企业级多智能体协同调度引擎</p>
        </div>
      </div>

      <div class="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>

      <div class="hidden sm:flex items-center gap-2 bg-slate-100/90 px-3 py-1 rounded-full text-xs font-semibold text-slate-700 border border-slate-200/60">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>运行引擎就绪</span>
        <span v-if="runningCount > 0" class="ml-1 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
          {{ runningCount }} 任务推流中
        </span>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <!-- Screen Display Scaling Selector -->
      <div class="relative">
        <button
          @click="showScaleDropdown = !showScaleDropdown; showDropdown = false"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          title="点击根据 17 英寸/2K 显示屏调整视觉比例与缩放"
        >
          <Monitor class="w-3.5 h-3.5 text-indigo-600" />
          <span class="hidden md:inline">{{ displayModeLabel }}</span>
          <ChevronDown class="w-3 h-3 text-slate-400" />
        </button>

        <div
          v-if="showScaleDropdown"
          class="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 z-50 text-xs space-y-1 animate-in fade-in duration-150"
        >
          <div class="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            屏幕尺寸与显示比例:
          </div>

          <button
            @click="selectDisplayMode('auto')"
            class="w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer"
            :class="state.displayMode === 'auto' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-50 text-slate-700'"
          >
            <div>
              <div class="font-bold flex items-center gap-1.5">
                <span>🤖 智能感知 (17"屏优选)</span>
                <span class="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-bold">推荐</span>
              </div>
              <p class="text-[10px] text-slate-400 font-normal">自动适应大屏基准字号与宽度</p>
            </div>
            <Check v-if="state.displayMode === 'auto'" class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </button>

          <button
            @click="selectDisplayMode('110')"
            class="w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer"
            :class="state.displayMode === '110' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-50 text-slate-700'"
          >
            <div>
              <div class="font-bold">🖥️ 110% 舒展大屏</div>
              <p class="text-[10px] text-slate-400 font-normal">专为 17 英寸笔记本/2K 显示器设计</p>
            </div>
            <Check v-if="state.displayMode === '110'" class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </button>

          <button
            @click="selectDisplayMode('100')"
            class="w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer"
            :class="state.displayMode === '100' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-50 text-slate-700'"
          >
            <div>
              <div class="font-bold">💻 100% 标准基准</div>
              <p class="text-[10px] text-slate-400 font-normal">适合 13-15 英寸便携本</p>
            </div>
            <Check v-if="state.displayMode === '100'" class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </button>

          <button
            @click="selectDisplayMode('125')"
            class="w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer"
            :class="state.displayMode === '125' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-50 text-slate-700'"
          >
            <div>
              <div class="font-bold">📺 125% 广角特大</div>
              <p class="text-[10px] text-slate-400 font-normal">4K 高分屏/远距离展示场景</p>
            </div>
            <Check v-if="state.displayMode === '125'" class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </button>

          <button
            @click="selectDisplayMode('90')"
            class="w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer"
            :class="state.displayMode === '90' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-50 text-slate-700'"
          >
            <div>
              <div class="font-bold">📱 92% 高密度紧凑</div>
              <p class="text-[10px] text-slate-400 font-normal">同屏平铺更多密集监控图表</p>
            </div>
            <Check v-if="state.displayMode === '90'" class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </button>
        </div>
      </div>

      <!-- Quick Route Actions -->
      <button
        @click="setRoute('workflow-edit')"
        class="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>新建工作流</span>
      </button>

      <!-- Account Switcher Dropdown -->
      <div class="relative">
        <button
          @click="showDropdown = !showDropdown; showScaleDropdown = false"
          class="flex items-center gap-2.5 p-1.5 pl-2.5 pr-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-medium cursor-pointer"
        >
          <img
            v-if="state.currentUser?.avatar"
            :src="state.currentUser.avatar"
            class="w-7 h-7 rounded-full object-cover border border-slate-200"
          />
          <div
            v-else
            class="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold"
          >
            {{ state.currentUser?.username.slice(0, 1).toUpperCase() }}
          </div>
          <div class="text-left hidden md:block">
            <div class="font-bold text-slate-900 leading-tight text-xs">
              {{ state.currentUser?.displayName }}
            </div>
            <div class="text-[11px] text-slate-400 font-mono">@{{ state.currentUser?.username }}</div>
          </div>
          <ChevronDown class="w-4 h-4 text-slate-400 ml-1" />
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="showDropdown"
          class="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 text-xs space-y-2"
        >
          <div class="p-2.5 bg-slate-50 rounded-xl space-y-1">
            <div class="font-bold text-slate-900 text-sm">{{ state.currentUser?.displayName }}</div>
            <div class="text-xs text-slate-500 font-mono">{{ state.currentUser?.email }}</div>
            <div class="pt-1">
              <span
                class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full"
                :class="
                  state.currentUser?.role === 'ADMIN'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : state.currentUser?.role === 'DEVELOPER'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                "
              >
                {{
                  state.currentUser?.role === 'ADMIN'
                    ? '超级管理员'
                    : state.currentUser?.role === 'DEVELOPER'
                    ? '开发者'
                    : '审计访客'
                }}
              </span>
            </div>
          </div>


          <div class="pt-2 border-t border-slate-100 space-y-1">
            <button
              @click="goToProfile"
              class="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-slate-100 text-slate-800 font-medium text-xs text-left transition-colors cursor-pointer"
            >
              <UserIcon class="w-4 h-4 text-slate-500" />
              <span>个人中心与账号设置</span>
            </button>
            <button
              @click="handleLogout"
              class="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-medium text-xs text-left transition-colors cursor-pointer"
            >
              <LogOut class="w-4 h-4 text-rose-500" />
              <span>退出系统</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, ChevronDown, User as UserIcon, LogOut, Monitor, Check } from 'lucide-vue-next';
import { useAppStore, DisplayMode } from '../../stores/useAppStore';

const { state, setRoute, setDisplayMode, logout } = useAppStore();
const showDropdown = ref(false);
const showScaleDropdown = ref(false);

const runningCount = computed(() => {
  return state.runs.filter((r) => r.status === 'running').length;
});

const displayModeLabel = computed(() => {
  switch (state.displayMode) {
    case 'auto':
      return '比例: 智能自适应';
    case '110':
      return '比例: 110% (17"屏)';
    case '100':
      return '比例: 100% 标准';
    case '125':
      return '比例: 125% 广角';
    case '90':
      return '比例: 92% 紧凑';
    default:
      return '比例调整';
  }
});

function selectDisplayMode(mode: DisplayMode) {
  setDisplayMode(mode);
  showScaleDropdown.value = false;
}

function goToProfile() {
  setRoute('profile');
  showDropdown.value = false;
}

function handleLogout() {
  showDropdown.value = false;
  logout();
}
</script>
