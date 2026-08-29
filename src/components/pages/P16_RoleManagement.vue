<template>
  <div class="p-6 lg:p-8 w-full space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
        <ShieldCheck class="w-6 h-6 text-indigo-600" />
        <span>角色与 RBAC 权限矩阵 (Role-Based Access Control)</span>
      </h2>
      <p class="text-xs sm:text-sm text-slate-500 mt-1">
        定义平台 5 大核心功能模块（工作流、Agent、MCP、LLM、用户）的 CRUD 细粒度操作控制
      </p>
    </div>

    <!-- Roles Grid -->
    <div v-if="state.roles.length > 0" class="space-y-6">
      <div
        v-for="role in state.roles"
        :key="role.id"
        class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4 card-elevated"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span
                class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border"
                :class="
                  role.code === 'ADMIN'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : role.code === 'DEVELOPER'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                "
              >
                <ShieldCheck class="w-4 h-4" />
              </span>
              <h3 class="font-bold text-slate-900 text-base sm:text-lg">{{ role.name }}</h3>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                Code: {{ role.code }}
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-500">{{ role.description }}</p>
          </div>

          <div class="text-xs font-bold text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100/80 self-start sm:self-auto shrink-0 shadow-2xs">
            {{ role.userCount }} 名成员分配使用
          </div>
        </div>

        <!-- Matrix Table -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table class="w-full text-left text-xs sm:text-sm border-collapse">
            <thead class="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th class="py-3 px-4">模块名称</th>
                <th class="py-3 px-4 text-center">读取 (Read)</th>
                <th class="py-3 px-4 text-center">创建 (Create)</th>
                <th class="py-3 px-4 text-center">更新 (Update)</th>
                <th class="py-3 px-4 text-center">删除 (Delete)</th>
                <th class="py-3 px-4">特殊特权</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="p in role.permissions"
                :key="p.moduleKey"
                class="hover:bg-slate-50/90 even:bg-slate-50/30 transition-colors"
              >
                <td class="py-3.5 px-4 font-bold text-slate-900">{{ p.module }}</td>
                <td class="py-3.5 px-4 text-center">
                  <span
                    v-if="p.read"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs"
                  >
                    <Check class="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100/60 text-slate-300"
                  >
                    <X class="w-3.5 h-3.5" />
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span
                    v-if="p.create"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs"
                  >
                    <Check class="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100/60 text-slate-300"
                  >
                    <X class="w-3.5 h-3.5" />
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span
                    v-if="p.update"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs"
                  >
                    <Check class="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100/60 text-slate-300"
                  >
                    <X class="w-3.5 h-3.5" />
                  </span>
                </td>
                <td class="py-3.5 px-4 text-center">
                  <span
                    v-if="p.delete"
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/70 shadow-2xs"
                  >
                    <Check class="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100/60 text-slate-300"
                  >
                    <X class="w-3.5 h-3.5" />
                  </span>
                </td>
                <td class="py-3.5 px-4 text-xs font-mono">
                  <span v-if="p.special" class="bg-indigo-50/80 text-indigo-700 font-bold px-2.5 py-1 rounded-lg border border-indigo-200/80 text-[11px] inline-block shadow-2xs">
                    {{ p.special }}
                  </span>
                  <span v-else class="text-slate-300 text-xs">无</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-16 px-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <ShieldCheck class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">暂无 RBAC 角色配置数据</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">后端服务器暂未返回角色权限矩阵记录。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldCheck, Check, X } from 'lucide-vue-next';
import { useAppStore } from '../../stores/useAppStore';

const { state } = useAppStore();
</script>
