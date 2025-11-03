<template>
  <div class="min-h-screen bg-black text-white">
    <NavigationBar @create-post="openPostModal" @logout="handleLogout" />
    <main class="mx-auto max-w-3xl px-4 py-6">
        <!-- Refresh controls: desktop button and mobile pull-to-refresh container -->
        <div class="mb-4 flex items-center justify-between">
          <div class="text-sm text-gray-400">Feed</div>
          <!-- Desktop: show button on md+ -->
          <button
            @click="manualRefresh"
            class="hidden md:inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-200 hover:border-cyan-500/40 hover:text-cyan-200 transition"
          >
            <svg v-if="isRefreshing" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span v-if="!isRefreshing">Atualizar</span>
            <span v-else>Atualizando...</span>
          </button>
        </div>
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

      <!-- Wrap feed in a container that handles touch pull-to-refresh on mobile -->
      <div
        v-else
        class="space-y-4"
        ref="feedScrollRef"
        @touchstart.passive="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        :style="{ transform: pullDistance ? `translateY(${pullDistance}px)` : 'none', transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(.2,.8,.2,1)' }"
      >
        <!-- Pull indicator (mobile only) -->
        <div v-show="pullDistance > 0" class="flex items-center justify-center mb-2">
          <div class="flex items-center gap-2">
            <svg v-if="isRefreshing" class="h-5 w-5 animate-spin text-cyan-300" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <svg v-else class="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
            </svg>
            <span class="text-xs text-gray-400">{{ isRefreshing ? 'Atualizando...' : (pullDistance >= pullThreshold ? 'Solte para atualizar' : 'Puxe para atualizar') }}</span>
          </div>
        </div>

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
import { nextTick, onMounted, onUnmounted, ref, watch, computed } from 'vue'
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
const feedScrollRef = ref(null)
const updateIntervals = new Map()
const visibilityObservers = new Map()

// pull-to-refresh state
const isRefreshing = ref(false)
const touchStartY = ref(0)
const pullDistance = ref(0)
const pullThreshold = 60
const isDragging = ref(false)

const isMobile = computed(() => window.matchMedia && window.matchMedia('(max-width: 767px)').matches)

let loadObserver = null

const registerPostRef = (postId, el) => {
  if (el) {
    postElements.set(postId, el)
    setupVisibilityObserver(postId, el)
  } else {
    postElements.delete(postId)
    cleanupVisibilityObserver(postId)
    animatedPosts.delete(postId)
  }
}

const setupVisibilityObserver = (postId, el) => {
  if (visibilityObservers.has(postId)) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startUpdate(postId)
        } else {
          stopUpdate(postId)
        }
      })
    },
    {
      root: null,
      threshold: 0.1 // Consider visible if 10% is in view
    }
  )

  observer.observe(el)
  visibilityObservers.set(postId, observer)
}

const cleanupVisibilityObserver = (postId) => {
  const observer = visibilityObservers.get(postId)
  if (observer) {
    observer.disconnect()
    visibilityObservers.delete(postId)
  }
  stopUpdate(postId)
}

const startUpdate = (postId) => {
  if (updateIntervals.has(postId)) return

  const interval = setInterval(async () => {
    await postsStore.fetchPostUpdates(postId)
  }, 5000) // 5 seconds

  updateIntervals.set(postId, interval)
}

const stopUpdate = (postId) => {
  const interval = updateIntervals.get(postId)
  if (interval) {
    clearInterval(interval)
    updateIntervals.delete(postId)
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

const manualRefresh = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  await postsStore.fetchPosts({ reset: true })
  isRefreshing.value = false
}

const doRefresh = async () => {
  // only one refresh at a time
  if (isRefreshing.value) return
  isDragging.value = false
  isRefreshing.value = true
  await postsStore.fetchPosts({ reset: true })
  // reset pull visual
  pullDistance.value = 0
  isRefreshing.value = false
}

const onTouchStart = (e) => {
  if (!isMobile.value) return
  if (window.scrollY > 0) {
    // reset state to avoid the gesture binding at middle of page
    touchStartY.value = 0
    pullDistance.value = 0
    isDragging.value = false
    return
  }
  touchStartY.value = e.touches[0]?.clientY || 0
  pullDistance.value = 0
}

const onTouchMove = (e) => {
  if (!isMobile.value) return
  if (touchStartY.value === 0) return
  if (window.scrollY > 0) {
    // user scrolled in default way, abort gesture
    touchStartY.value = 0
    pullDistance.value = 0
    isDragging.value = false
    return
  }
  const currentY = e.touches[0]?.clientY || 0
  const delta = currentY - touchStartY.value
  if (delta <= 0) {
    pullDistance.value = 0
    isDragging.value = false
    touchStartY.value = currentY
    return
  }

  if (delta <= 5) {
    pullDistance.value = 0
    isDragging.value = false
    return
  }

  e.preventDefault()
  isDragging.value = true
  // smooth, easing-like damping using exponential approach for natural feel
  const eased = (1 - Math.exp(-delta / 120)) * 140
  pullDistance.value = Math.min(eased, 140)
}

const onTouchEnd = async () => {
  if (!isMobile.value) return
  if (!isDragging.value && pullDistance.value <= 0) {
    touchStartY.value = 0
    pullDistance.value = 0
    return
  }

  if (window.scrollY > 0) {
    touchStartY.value = 0
    pullDistance.value = 0
    isDragging.value = false
    return
  }

  if (pullDistance.value >= pullThreshold) {
    await doRefresh()
  } else {
    // animate back smoothly
    isDragging.value = false
    pullDistance.value = 0
  }
  touchStartY.value = 0
}

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
  // Clean up visibility observers and update intervals
  visibilityObservers.forEach((observer) => observer.disconnect())
  visibilityObservers.clear()
  updateIntervals.forEach((interval) => clearInterval(interval))
  updateIntervals.clear()
})

</script>