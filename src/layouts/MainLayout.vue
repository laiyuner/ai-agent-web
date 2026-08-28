<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 flex flex-col antialiased selection:bg-indigo-600 selection:text-white">
    <!-- Header -->
    <Header />

    <!-- Main Content Area with Sidebar -->
    <div class="flex-1 flex overflow-hidden">
      <Sidebar v-if="state.route !== 'workflow-edit'" />

      <main class="flex-1 overflow-y-auto bg-slate-100/80">
        <router-view :key="$route.fullPath" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '../components/common/Header.vue';
import Sidebar from '../components/common/Sidebar.vue';
import { useAppStore } from '../stores/useAppStore';

const { state } = useAppStore();
</script>
