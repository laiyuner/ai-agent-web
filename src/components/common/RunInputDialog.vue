<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      >
        <div
          class="modal-panel w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100 relative"
        >
          <!-- Header -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Play class="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 class="text-base font-bold text-white">执行工作流：{{ workflow?.name || '未定义工作流' }}</h3>
                <p class="text-xs text-slate-400 mt-0.5">请输入工作流的执行内容，这将作为起始节点的输入</p>
              </div>
            </div>
            <button
              @click="handleClose"
              :disabled="loading"
              class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30 cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

        <!-- Input Area -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-slate-300">
            执行输入 (Input Content) <span class="text-rose-400">*</span>
          </label>
          <textarea
            v-model="inputContent"
            :disabled="loading"
            rows="5"
            placeholder="例如：请生成关于 RAG 技术的研究报告..."
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all resize-none"
          ></textarea>
        </div>

        <!-- Error Alert Banner -->
        <div
          v-if="errorMessage"
          class="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5"
        >
          <AlertCircle class="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div class="space-y-0.5 flex-1 leading-relaxed">
            <span class="font-bold">调度执行异常：</span>
            <span>{{ errorMessage }}</span>
          </div>
        </div>

        <!-- Action Footer Buttons -->
        <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            @click="handleClose"
            :disabled="loading"
            class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            取消
          </button>
          <button
            @click="handleRun"
            :disabled="!inputContent.trim() || loading"
            class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-indigo-600 cursor-pointer"
          >
            <div v-if="loading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <Play v-else class="w-3.5 h-3.5 fill-current" />
            <span>{{ loading ? '正在提交调度...' : '开始执行' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Play, X, AlertCircle } from 'lucide-vue-next';
import { triggerRun } from '../../stores/useAppStore';
import { Workflow } from '../../types';

const props = defineProps<{
  isOpen: boolean;
  workflow: Workflow | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success', runRecord: any): void;
}>();

const inputContent = ref('');
const loading = ref(false);
const errorMessage = ref('');

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      inputContent.value = '';
      errorMessage.value = '';
      loading.value = false;
    }
  }
);

function handleClose() {
  if (loading.value) return;
  errorMessage.value = '';
  emit('close');
}

async function handleRun() {
  if (!props.workflow || !inputContent.value.trim() || loading.value) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    const runRecord = await triggerRun(props.workflow.id, inputContent.value.trim());
    emit('success', runRecord);
    emit('close');
  } catch (err: any) {
    errorMessage.value = err.message || '触发调度失败，请查看错误或检查工作流状态';
  } finally {
    loading.value = false;
  }
}
</script>
