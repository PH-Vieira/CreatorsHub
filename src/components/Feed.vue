<template>
  <div class="min-h-screen bg-black text-white">
    <header class="bg-gray-800 p-4 border-b border-gray-700">
      <div class="max-w-2xl mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold text-cyan-400">CreatorsHub Feed</h1>
        <div class="flex items-center gap-3">
          <button
            v-if="authStore.isCreator"
            @click="openPostModal"
            class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-semibold transition"
          >
            Novo post
          </button>
          <router-link
            to="/profile"
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition"
          >
            Perfil
          </router-link>
          <button
            @click="handleLogout"
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
    <main class="max-w-2xl mx-auto p-4">
      <!-- Post Creation Modal -->
      <transition name="fade">
        <div
          v-if="showPostModal"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            class="absolute inset-0 bg-black/70"
            @click="closePostModal"
          ></div>
          <div class="relative z-10 w-full max-w-xl mx-4">
            <button
              @click="closePostModal"
              class="absolute right-4 top-4 z-10 text-gray-400 hover:text-white transition"
              aria-label="Fechar"
            >
              ✕
            </button>
            <PostForm @success="handlePostSuccess" @cancel="closePostModal" />
          </div>
        </div>
      </transition>

      <!-- Posts Feed -->
      <div v-if="postsStore.loading && postsStore.posts.length === 0" class="text-center py-8">
        <p class="text-gray-400">Loading posts...</p>
      </div>

      <div v-else-if="postsStore.posts.length === 0" class="text-center py-8">
        <p class="text-gray-400">No posts yet. Be the first to share something!</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="post in postsStore.posts"
          :key="post.id"
          class="bg-gray-800 p-4 rounded-lg border border-gray-700"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold mr-3 overflow-hidden">
                <img
                  v-if="post.users && post.users.avatar_url"
                  :src="post.users.avatar_url"
                  :alt="getDisplayName(post)"
                  class="w-full h-full object-cover"
                />
                <span v-else>{{ getInitials(post) }}</span>
              </div>
              <div>
                <p class="font-semibold">{{ getDisplayName(post) }}</p>
                <p class="text-gray-400 text-sm">{{ formatDate(post.created_at) }}</p>
              </div>
            </div>
            <button
              v-if="authStore.isAdmin"
              @click="handleDeletePost(post.id)"
              class="text-sm text-red-400 hover:text-red-300 transition"
            >
              Excluir
            </button>
          </div>

          <h3 class="text-lg font-semibold mb-2">{{ post.title }}</h3>

          <p v-if="post.content" class="text-gray-300 mb-3">{{ post.content }}</p>

          <div v-if="post.image_url" class="mb-3">
            <img
              :src="post.image_url"
              :alt="post.title"
              class="w-full max-h-96 object-cover rounded-lg"
              loading="lazy"
            />
          </div>

          <ReactionBar :entity-id="post.id" entity-type="post" />
          <CommentSection :post-id="post.id" />
        </div>
      </div>

      <div
        v-if="postsStore.hasMore && postsStore.posts.length > 0"
        ref="loadMoreRef"
        class="flex justify-center py-6 text-sm text-gray-400"
      >
        <span>
          {{ postsStore.loadingMore ? 'Carregando mais...' : 'Desça para carregar mais' }}
        </span>
      </div>
    </main>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import { useRouter } from 'vue-router'
import PostForm from '@/components/PostForm.vue'
import ReactionBar from '@/components/ReactionBar.vue'
import CommentSection from '@/components/CommentSection.vue'

const authStore = useAuthStore()
const postsStore = usePostsStore()
const router = useRouter()
const showPostModal = ref(false)
const loadMoreRef = ref(null)

let loadObserver = null

const observeSentinel = () => {
  if (!loadMoreRef.value || !postsStore.hasMore) {
    if (loadObserver) {
      loadObserver.disconnect()
      loadObserver = null
    }
    return
  }

  loadObserver = new IntersectionObserver((entries) => {
    const [entry] = entries
    if (entry?.isIntersecting) {
      postsStore.fetchMore()
    }
  }, {
    root: null,
    threshold: 0.25
  })

  loadObserver.observe(loadMoreRef.value)
}

onMounted(async () => {
  if (postsStore.posts.length === 0) {
    await postsStore.fetchPosts()
  }

  nextTick(() => {
    observeSentinel()
  })
})

const handleLogout = async () => {
  showPostModal.value = false
  await authStore.signOut()
  router.push('/')
}

const openPostModal = () => {
  if (!authStore.isCreator) return
  showPostModal.value = true
}

const closePostModal = () => {
  showPostModal.value = false
}

const handlePostSuccess = () => {
  closePostModal()
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && showPostModal.value) {
    closePostModal()
  }
}

watch(showPostModal, (visible) => {
  if (visible) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

watch(
  () => postsStore.posts.length,
  () => {
    nextTick(() => {
      observeSentinel()
    })
  }
)

watch(
  () => postsStore.hasMore,
  () => {
    nextTick(() => {
      observeSentinel()
    })
  }
)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (loadObserver) {
    loadObserver.disconnect()
  }
})

const handleDeletePost = async (postId) => {
  if (!authStore.isAdmin) return

  const confirmed = window.confirm('Deseja realmente excluir este post?')
  if (!confirmed) return

  const result = await postsStore.deletePost(postId)
  if (!result.success) {
    window.alert(`Erro ao excluir post: ${result.error}`)
  }
}

const getDisplayName = (post) => {
  return post.users?.full_name || post.users?.username || post.users?.email || 'Usuário'
}

const getInitials = (post) => {
  const display = getDisplayName(post)
  return display.charAt(0).toUpperCase() || 'U'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))

  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`

  return date.toLocaleDateString()
}
</script>