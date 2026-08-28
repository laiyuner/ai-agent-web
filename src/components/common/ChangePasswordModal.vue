<template>
  <div
    v-if="state.mustResetPasswordModalOpen"
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
  >
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 shrink-0">
          <KeyRound class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900">首次登录强制重置初始密码</h3>
          <p class="text-xs text-slate-500">为了保障平台自托管数据安全，请立即修改您的默认密码。</p>
        </div>
      </div>

      <div class="space-y-3 pt-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">当前初始密码</label>
          <input
            v-model="oldPassword"
            type="password"
            placeholder="请输入管理员分发的初始密码"
            class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">设置新强密码</label>
          <input
            v-model="newPassword"
            type="password"
            placeholder="至少 8 位，且需同时包含字母和数字"
            class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">确认新密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入新密码"
            class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div v-if="error" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ error }}</span>
        </div>
      </div>

      <div class="pt-3 flex justify-end">
        <button
          @click="handleSubmit"
          :disabled="submitting"
          class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white font-medium text-xs rounded-xl shadow-md transition-all"
        >
          {{ submitting ? '正在提交...' : '确认修改并开启系统' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { KeyRound, AlertCircle } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';

const { state, completePasswordReset } = useAppStore();

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const submitting = ref(false);

/** 与后端 AuthService.isValidPassword 规则一致：≥ 8 位且同时包含字母和数字 */
function isValidNewPassword(pwd: string): boolean {
  return pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /\d/.test(pwd);
}

async function handleSubmit() {
  if (submitting.value) return;
  if (!oldPassword.value) {
    error.value = '请填入原初始密码';
    return;
  }
  if (!isValidNewPassword(newPassword.value)) {
    error.value = '新密码至少 8 位，且需同时包含字母和数字';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  error.value = '';
  submitting.value = true;
  // 失败时 completePasswordReset 返回 false，弹窗保持打开并已通过 Toast 提示原因
  await completePasswordReset(oldPassword.value, newPassword.value);
  submitting.value = false;
}
</script>
