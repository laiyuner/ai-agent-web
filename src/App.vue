<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased selection:bg-indigo-500 selection:text-white">
    <!-- Router View Container -->
    <router-view />

    <!-- Global Toast Notifications -->
    <Toast />

    <!-- 全局强制改密弹窗：必须挂在 App 根组件，登录页(/login)未挂载 MainLayout，
         若只放 MainLayout 会导致首次登录时弹窗永远不显示（卡死登录页的根因） -->
    <ChangePasswordModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import Toast from './components/common/Toast.vue';
import ChangePasswordModal from './components/common/ChangePasswordModal.vue';
import { applyDisplayScale } from './stores/useAppStore';

onMounted(() => {
  applyDisplayScale();
});
</script>
