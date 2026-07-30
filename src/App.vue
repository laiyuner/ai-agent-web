<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased selection:bg-indigo-500 selection:text-white">
    <!-- Router View Container -->
    <router-view />

    <!-- Global Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import Toast from './components/common/Toast.vue';
import { applyDisplayScale } from './stores/useAppStore';

onMounted(() => {
  applyDisplayScale();
});
</script>
