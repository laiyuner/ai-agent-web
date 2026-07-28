<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
    <transition-group name="toast">
      <div
        v-for="toast in state.toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-200"
        :class="getStyle(toast.type)"
      >
        <component :is="getIcon(toast.type)" class="w-5 h-5 shrink-0 mt-0.5" />
        <div class="flex-1 text-xs leading-relaxed">
          <div v-if="toast.title" class="font-semibold text-slate-800 text-sm mb-0.5">
            {{ toast.title }}
          </div>
          <p class="text-slate-600">{{ toast.message }}</p>
        </div>
        <button
          @click="removeToast(toast.id)"
          class="p-1 hover:bg-slate-200/50 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';

const { state, removeToast } = useAppStore();

function getIcon(type: string) {
  switch (type) {
    case 'success':
      return CheckCircle2;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    default:
      return Info;
  }
}

function getStyle(type: string) {
  switch (type) {
    case 'success':
      return 'bg-emerald-50/90 border-emerald-200 text-emerald-800';
    case 'error':
      return 'bg-rose-50/90 border-rose-200 text-rose-800';
    case 'warning':
      return 'bg-amber-50/90 border-amber-200 text-amber-800';
    default:
      return 'bg-slate-50/90 border-slate-200 text-slate-800';
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.9);
}
</style>
