<template>
  <div class="min-h-screen bg-black text-white">
    <NavigationBar @create-post="openPostModal" @logout="handleLogout" />
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
        <PostCard
          v-for="post in postsStore.posts"
          :key="post.id"
          :post="post"
          @mounted="(el) => registerPostRef(post.id, el)"
          @unmounted="() => registerPostRef(post.id, null)"
        />
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
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import { useRouter } from 'vue-router'
import PostForm from '@/components/PostForm.vue'
import NavigationBar from '@/components/NavigationBar.vue'
import PostCard from '@/components/PostCard.vue'

const authStore = useAuthStore()
const postsStore = usePostsStore()
const router = useRouter()
const showPostModal = ref(false)
const loadMoreRef = ref(null)
const postElements = new Map()
const animatedPosts = new Set()

let loadObserver = null

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

</script>