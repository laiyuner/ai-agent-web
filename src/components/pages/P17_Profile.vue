<template>
  <div class="p-6 lg:p-8 w-full max-w-5xl space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
        <UserIcon class="w-6 h-6 text-indigo-600" />
        <span>个人中心与账号设置 (User Profile)</span>
      </h2>
      <p class="text-xs sm:text-sm text-slate-500 mt-1">
        查看和修改当前登入账号的基础资料、通知偏好与凭证重置
      </p>
    </div>

    <!-- User Card -->
    <div class="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6 card-elevated">
      <div class="flex items-center gap-5 pb-6 border-b border-slate-100">
        <img
          v-if="state.currentUser?.avatar"
          :src="state.currentUser.avatar"
          class="w-20 h-20 rounded-3xl object-cover shadow-2xs border border-slate-200"
        />
        <div v-else class="w-20 h-20 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-2xl shadow-2xs">
          {{ state.currentUser?.username.slice(0, 1).toUpperCase() }}
        </div>

        <div class="space-y-1.5">
          <h3 class="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{{ state.currentUser?.displayName }}</h3>
          <div class="text-xs sm:text-sm text-slate-500 font-mono">@{{ state.currentUser?.username }} · {{ state.currentUser?.email }}</div>
          <div class="pt-1">
            <span
              class="text-xs font-bold px-3 py-1 rounded-full border inline-flex items-center gap-1.5"
              :class="
                state.currentUser?.role === 'ADMIN'
                  ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                  : state.currentUser?.role === 'DEVELOPER'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                  : 'bg-slate-100 text-slate-700 border-slate-200/80'
              "
            >
              {{ state.currentUser?.role === 'ADMIN' ? '超级管理员' : state.currentUser?.role === 'DEVELOPER' ? '开发者' : '审计访客' }} ({{ state.currentUser?.role }})
            </span>
          </div>
        </div>
      </div>

      <!-- Form Inputs -->
      <div class="space-y-5 text-xs sm:text-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block font-bold text-slate-800 mb-1.5">显示名称</label>
            <input
              v-model="displayName"
              type="text"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-800 mb-1.5">电子邮箱</label>
            <input
              v-model="email"
              type="email"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-all"
            />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-800 mb-1.5">头像图片 URL</label>
          <input
            v-model="avatar"
            type="text"
            placeholder="https://..."
            class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-all"
          />
        </div>

        <div class="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            @click="triggerPasswordReset"
            class="text-xs sm:text-sm text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-4 py-2.5 rounded-xl border border-amber-200/80 transition-colors flex items-center gap-2 cursor-pointer btn-tactile"
          >
            <KeyRound class="w-4 h-4" />
            <span>手动触发初始密码重置弹窗</span>
          </button>

          <button
            @click="handleSaveProfile"
            class="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer btn-tactile"
          >
            保存个人资料
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { User as UserIcon, KeyRound } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';

const { state, updateUser } = useAppStore();

const displayName = ref(state.currentUser?.displayName || '');
const email = ref(state.currentUser?.email || '');
const avatar = ref(state.currentUser?.avatar || '');

function handleSaveProfile() {
  if (state.currentUser) {
    updateUser(state.currentUser.id, {
      displayName: displayName.value,
      email: email.value,
      avatar: avatar.value,
    });
  }
}

function triggerPasswordReset() {
  state.mustResetPasswordModalOpen = true;
}
</script>
