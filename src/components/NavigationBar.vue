<template>
  <header class="border-b border-gray-800 bg-gradient-to-r from-black via-gray-900 to-black">
    <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5">
      <router-link to="/feed" class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/60 bg-cyan-500/10 text-lg font-black tracking-tight text-cyan-300">
          CH
        </div>
        <div class="text-left">
          <p class="text-2xl font-black tracking-tight text-white">CreatorsHub</p>
          <p class="text-xs uppercase tracking-[0.3em] text-cyan-400">Create • Share • Inspire</p>
        </div>
      </router-link>

      <nav class="flex flex-wrap items-center gap-3 text-sm font-semibold">
        <router-link
          to="/feed"
          :class="linkClasses('/feed')"
        >
          Feed
        </router-link>
        <router-link
          to="/favorites"
          :class="linkClasses('/favorites')"
        >
          Favoritos
        </router-link>
        <button
          v-if="authStore.isCreator"
          @click="handleCreatePost"
          class="inline-flex items-center gap-2 rounded-full bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
        >
          <span>+</span>
          <span>Novo post</span>
        </button>
        <router-link
          to="/profile"
          class="flex items-center gap-2 rounded-full border border-gray-700/70 bg-gray-800/70 px-3 py-1.5 text-sm font-medium text-gray-200 transition hover:border-cyan-500/60 hover:text-white"
        >
          <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-700 text-xs font-semibold text-gray-300">
            <img
              v-if="authStore.profile?.avatar_url"
              :src="authStore.profile.avatar_url"
              :alt="profileDisplayName"
              class="h-full w-full object-cover"
            />
            <span v-else>{{ profileInitial }}</span>
          </div>
          <span>{{ profileDisplayName }}</span>
        </router-link>
        <button
          @click="emit('logout')"
          class="inline-flex items-center rounded-full border border-gray-700/80 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-red-500/60 hover:text-red-300"
        >
          Logout
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['create-post', 'logout'])

const route = useRoute()
const authStore = useAuthStore()

const profileDisplayName = computed(() => authStore.profile?.full_name || authStore.user?.email || 'Seu perfil')
const profileInitial = computed(() => profileDisplayName.value.charAt(0).toUpperCase())

const linkClasses = (path) => {
  const isActive = route.path === path
  return [
    'inline-flex items-center rounded-full border px-4 py-2 transition',
    isActive
      ? 'border-cyan-500/70 bg-cyan-500/10 text-white'
      : 'border-gray-700/80 bg-gray-800/60 text-gray-200 hover:border-cyan-500/60 hover:text-white'
  ]
}

const handleCreatePost = () => {
  if (!authStore.isCreator) return
  emit('create-post')
}
</script>
