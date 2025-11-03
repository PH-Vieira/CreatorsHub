<template>
  <div class="min-h-screen bg-black text-white">
    <NavigationBar @create-post="handleCreatePost" @logout="handleLogout" />
    <main class="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <header class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-cyan-400">Coleção pessoal</p>
          <h1 class="mt-1 text-3xl font-black text-white">Posts favoritados</h1>
        </div>
      </header>

      <section>
        <div v-if="postsStore.loadingFavorites" class="py-16 text-center text-gray-400">
          Carregando favoritos...
        </div>
        <div v-else-if="!favoritePosts.length" class="py-16 text-center text-gray-400">
          Nenhum post favoritado ainda. Explore o feed e marque seus conteúdos preferidos!
        </div>
        <div v-else class="space-y-4">
          <PostCard
            v-for="post in favoritePosts"
            :key="post.id"
            :post="post"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import NavigationBar from '@/components/NavigationBar.vue'
import PostCard from '@/components/PostCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const postsStore = usePostsStore()

const favoritePosts = computed(() => postsStore.favoritePosts)

const loadFavorites = async () => {
  await postsStore.fetchFavoritePosts()
}

onMounted(() => {
  if (authStore.user) {
    loadFavorites()
  }
})

watch(
  () => authStore.user?.id,
  (newId) => {
    if (newId) {
      loadFavorites()
    } else {
      postsStore.favoritePosts = []
    }
  }
)

const handleCreatePost = () => {
  router.push('/feed')
}

const handleLogout = async () => {
  await authStore.signOut()
  router.push('/')
}
</script>
