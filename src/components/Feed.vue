<template>
  <div class="min-h-screen bg-black text-white">
    <header class="border-b border-gray-800 bg-gradient-to-r from-black via-gray-900 to-black">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/60 bg-cyan-500/10 text-lg font-black tracking-tight text-cyan-300">
            CH
          </div>
          <div>
            <p class="text-2xl font-black tracking-tight text-white">CreatorsHub</p>
            <p class="text-xs uppercase tracking-[0.3em] text-cyan-400">Create • Share • Inspire</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <router-link
            to="/feed"
            class="inline-flex items-center rounded-full border border-gray-700/80 bg-gray-800/60 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-500/60 hover:text-white"
          >
            Feed
          </router-link>
          <button
            v-if="authStore.isCreator"
            @click="openPostModal"
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
            @click="handleLogout"
            class="inline-flex items-center rounded-full border border-gray-700/80 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-red-500/60 hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-3xl px-4 py-6">
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
          :ref="(el) => registerPostRef(post.id, el)"
          class="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg shadow-black/30 backdrop-blur-sm"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
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
const postElements = new Map()
const animatedPosts = new Set()

let loadObserver = null

const profileDisplayName = computed(() => authStore.profile?.full_name || authStore.user?.email || 'Seu perfil')
const profileInitial = computed(() => profileDisplayName.value.charAt(0).toUpperCase())

const registerPostRef = (postId, el) => {
  if (el) {
    postElements.set(postId, el)
  } else {
    postElements.delete(postId)
    animatedPosts.delete(postId)
  }
}

const animateNewPosts = (postIds) => {
  postIds.forEach((postId, index) => {
    if (animatedPosts.has(postId)) return
    const element = postElements.get(postId)
    if (!element) return
    gsap.fromTo(
      element,
      { autoAlpha: 0, y: 24, scale: 0.98 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        delay: index * 0.08
      }
    )
    animatedPosts.add(postId)
  })
}

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
    animateNewPosts(postsStore.posts.map((post) => post.id))
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

watch(
  () => postsStore.posts.map((post) => post.id),
  (postIds) => {
    nextTick(() => {
      animateNewPosts(postIds)
    })
  },
  { immediate: true }
)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (loadObserver) {
    loadObserver.disconnect()
  }
  postElements.clear()
  animatedPosts.clear()
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