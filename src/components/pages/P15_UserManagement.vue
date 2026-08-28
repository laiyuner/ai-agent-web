<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Users class="w-6 h-6 text-indigo-600" />
          <span>用户账号与成员运维 (User Account Management)</span>
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          配置平台使用者身份、分配 RBAC 访问权限与控制初始密码强制修改政策
        </p>
      </div>

      <button
        v-if="hasPermission('user:create')"
        @click="showCreateModal = true"
        class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
      >
        <UserPlus class="w-4 h-4 text-emerald-400" />
        <span>添加新成员</span>
      </button>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
            <tr>
              <th class="py-4 px-5">成员名称</th>
              <th class="py-4 px-5">用户名 / 邮箱</th>
              <th class="py-4 px-5">当前角色</th>
              <th class="py-4 px-5">账号状态</th>
              <th class="py-4 px-5">上次登录</th>
              <th class="py-4 px-5 text-right">运维操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="state.users.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400">
                <div class="space-y-2">
                  <p class="font-bold text-slate-700 text-sm">暂无用户账号数据</p>
                  <p class="text-xs text-slate-400">请点击右上角【添加新成员】按钮配置平台成员</p>
                </div>
              </td>
            </tr>
            <tr v-else v-for="u in state.users" :key="u.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                  <img v-if="u.avatar" :src="u.avatar" class="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" />
                  <div v-else class="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    {{ u.username.slice(0, 1).toUpperCase() }}
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 text-sm block">{{ u.displayName }}</span>
                    <span v-if="u.id === state.currentUser?.id" class="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">当前登录账号</span>
                  </div>
                </div>
              </td>
              <td class="py-4 px-5">
                <div class="font-mono font-bold text-slate-800">@{{ u.username }}</div>
                <div class="text-xs text-slate-500 font-mono">{{ u.email }}</div>
              </td>
              <td class="py-4 px-5">
                <span
                  class="px-3 py-1 rounded-full font-bold text-xs inline-flex items-center gap-1.5"
                  :class="
                    u.role === 'ADMIN'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : u.role === 'DEVELOPER'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  "
                >
                  <ShieldCheck class="w-3.5 h-3.5" />
                  {{ u.role === 'ADMIN' ? '超级管理员' : u.role === 'DEVELOPER' ? '开发者' : '审计访客' }}
                </span>
              </td>
              <td class="py-4 px-5">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" :class="u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                  <span class="text-xs font-semibold text-slate-800">{{ u.status === 'active' ? '正常激活' : '已冻结' }}</span>
                  <span v-if="u.mustResetPassword" class="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold border border-amber-200">
                    需重置密码
                  </span>
                </div>
              </td>
              <td class="py-4 px-5 text-slate-500 font-mono text-xs">{{ u.lastLogin }}</td>
              <td class="py-4 px-5 text-right">
                <div class="flex items-center justify-end gap-2">
                  <!-- Assign Role Button -->
                  <button
                    v-if="hasPermission('user:update')"
                    @click="openAssignRoleModal(u)"
                    title="分配 RBAC 角色权限"
                    class="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 text-xs font-bold border border-indigo-200/80 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ShieldCheck class="w-3.5 h-3.5 text-indigo-600" />
                    <span>分配角色</span>
                  </button>

                  <button
                    v-if="hasPermission('user:reset_pwd')"
                    @click="resetUserPassword(u.id)"
                    title="强制重置初始密码"
                    class="p-1.5 rounded-xl text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                  >
                    <KeyRound class="w-4 h-4" />
                  </button>
                  <button
                    v-if="hasPermission('user:delete') && u.id !== state.currentUser?.id"
                    @click="deleteUser(u.id)"
                    title="注销该成员账号"
                    class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Assign Role Modal -->
    <div v-if="showRoleModal && selectedUser" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base">分配 RBAC 角色</h3>
              <p class="text-xs text-slate-500">调整成员在平台中的操作与审批权限</p>
            </div>
          </div>
          <button @click="showRoleModal = false" class="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">&times;</button>
        </div>

        <div class="space-y-4">
          <!-- Target User Info -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {{ selectedUser.username.slice(0, 1).toUpperCase() }}
            </div>
            <div>
              <div class="font-bold text-slate-900 text-sm">{{ selectedUser.displayName }}</div>
              <div class="text-xs text-slate-500 font-mono">@{{ selectedUser.username }} • {{ selectedUser.email }}</div>
            </div>
          </div>

          <!-- Role Options -->
          <div class="space-y-2.5">
            <label class="block text-xs font-bold text-slate-700">选择角色身份</label>
            
            <div
              @click="targetRole = 'ADMIN'"
              class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3"
              :class="targetRole === 'ADMIN' ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20' : 'border-slate-200 hover:bg-slate-50'"
            >
              <ShieldAlert class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div class="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>超级管理员 (ADMIN)</span>
                  <span class="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">完全控制</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">拥有全局工作流管理、MCP注册、LLM密钥配置以及用户角色调配权限。</p>
              </div>
            </div>

            <div
              @click="targetRole = 'DEVELOPER'"
              class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3"
              :class="targetRole === 'DEVELOPER' ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:bg-slate-50'"
            >
              <UserCheck class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div class="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>开发者 (DEVELOPER)</span>
                  <span class="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">编排与运维</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">可创建与发布 Agent 工作流、触发执行与调试推流日志，无账号管理权限。</p>
              </div>
            </div>

            <div
              @click="targetRole = 'VIEWER'"
              class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3"
              :class="targetRole === 'VIEWER' ? 'border-slate-400 bg-slate-100/50 ring-2 ring-slate-400/20' : 'border-slate-200 hover:bg-slate-50'"
            >
              <Eye class="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <div class="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>审计访客 (VIEWER)</span>
                  <span class="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">只读监控</span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">仅可查看工作流运行状态与统计图表，禁止变更任何系统配置或修改流。</p>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button @click="showRoleModal = false" class="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            取消
          </button>
          <button @click="confirmAssignRole" class="px-5 py-2 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer">
            确认更新角色
          </button>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 class="font-bold text-slate-900 text-base">创建平台成员账号</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">用户名 *</label>
            <input
              v-model="newUser.username"
              type="text"
              placeholder="e.g. dev_zhang"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">显示名称 *</label>
            <input
              v-model="newUser.displayName"
              type="text"
              placeholder="例如: 张三 (高级架构师)"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">电子邮箱 *</label>
            <input
              v-model="newUser.email"
              type="email"
              placeholder="zhangsan@company.com"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">初始 RBAC 角色</label>
            <select
              v-model="newUser.role"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ADMIN">超级管理员 (ADMIN)</option>
              <option value="DEVELOPER">开发者 (DEVELOPER)</option>
              <option value="VIEWER">审计访客 (VIEWER)</option>
            </select>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button @click="showCreateModal = false" class="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            取消
          </button>
          <button @click="handleCreateUser" class="px-5 py-2.5 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all cursor-pointer">
            立即创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Users, UserPlus, KeyRound, Trash2, X, ShieldCheck, ShieldAlert, UserCheck, Eye } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';
import { RoleType, User } from '../../types';

const { state, addUser, updateUser, resetUserPassword, deleteUser, hasPermission } = useAppStore();

const showCreateModal = ref(false);
const showRoleModal = ref(false);
const selectedUser = ref<User | null>(null);
const targetRole = ref<RoleType>('DEVELOPER');

const newUser = ref({
  username: '',
  displayName: '',
  email: '',
  role: 'DEVELOPER' as RoleType,
  status: 'active' as const,
  mustResetPassword: true,
});

function openAssignRoleModal(user: User) {
  selectedUser.value = user;
  targetRole.value = user.role;
  showRoleModal.value = true;
}

function confirmAssignRole() {
  if (selectedUser.value) {
    updateUser(selectedUser.value.id, { role: targetRole.value });
    showRoleModal.value = false;
  }
}

function handleCreateUser() {
  if (!newUser.value.username || !newUser.value.displayName) return;
  addUser({ ...newUser.value });
  showCreateModal.value = false;
  newUser.value = {
    username: '',
    displayName: '',
    email: '',
    role: 'DEVELOPER',
    status: 'active',
    mustResetPassword: true,
  };
}
</script>
