<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased selection:bg-indigo-500 selection:text-white">
    <!-- Unauthenticated Login View -->
    <P01_Login v-if="!state.isLoggedIn || state.route === 'login'" />

    <!-- Authenticated App Shell -->
    <div v-else class="min-h-screen flex flex-col">
      <Header />

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar Navigation -->
        <Sidebar v-if="state.route !== 'workflow-edit'" />

        <!-- Dynamic View Router Container -->
        <main class="flex-1 overflow-y-auto bg-slate-100/70">
          <component :is="currentPageComponent" />
        </main>
      </div>

      <!-- Modals -->
      <ChangePasswordModal />
    </div>

    <!-- Global Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useAppStore } from './stores/useAppStore';

import Header from './components/common/Header.vue';
import Sidebar from './components/common/Sidebar.vue';
import Toast from './components/common/Toast.vue';
import ChangePasswordModal from './components/common/ChangePasswordModal.vue';

import P01_Login from './components/pages/P01_Login.vue';
import P04_Dashboard from './components/pages/P04_Dashboard.vue';
import P05_WorkflowList from './components/pages/P05_WorkflowList.vue';
import P06_WorkflowEditor from './components/pages/P06_WorkflowEditor.vue';
import P07_ExecutionMonitor from './components/pages/P07_ExecutionMonitor.vue';
import P08_AgentList from './components/pages/P08_AgentList.vue';
import P10_MCPServerList from './components/pages/P10_MCPServerList.vue';
import P12_LLMProviderList from './components/pages/P12_LLMProviderList.vue';
import P13_ExecutionHistory from './components/pages/P13_ExecutionHistory.vue';
import P14_ExecutionDetail from './components/pages/P14_ExecutionDetail.vue';
import P15_UserManagement from './components/pages/P15_UserManagement.vue';
import P16_RoleManagement from './components/pages/P16_RoleManagement.vue';
import P17_Profile from './components/pages/P17_Profile.vue';

const { state, refreshRouteData } = useAppStore();

watch(
  [() => state.route, () => state.isLoggedIn],
  ([newRoute, isLoggedIn]) => {
    if (isLoggedIn && newRoute && newRoute !== 'login') {
      refreshRouteData(newRoute);
    }
  },
  { immediate: true }
);

const currentPageComponent = computed(() => {
  switch (state.route) {
    case 'login':
      return P01_Login;
    case 'dashboard':
      return P04_Dashboard;
    case 'workflows':
      return P05_WorkflowList;
    case 'workflow-edit':
      return P06_WorkflowEditor;
    case 'workflow-monitor':
      return P07_ExecutionMonitor;
    case 'agents':
      return P08_AgentList;
    case 'mcp-servers':
      return P10_MCPServerList;
    case 'llm-providers':
      return P12_LLMProviderList;
    case 'runs':
      return P13_ExecutionHistory;
    case 'run-detail':
      return P14_ExecutionDetail;
    case 'users':
      return P15_UserManagement;
    case 'roles':
      return P16_RoleManagement;
    case 'profile':
      return P17_Profile;
    default:
      return P04_Dashboard;
  }
});
</script>
