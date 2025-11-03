<template>
  <article
    ref="rootEl"
    :class="cardClasses"
    role="button"
    tabindex="0"
    @click="handleNavigate"
    @keydown.enter.prevent="handleNavigate"
    @keydown.space.prevent="handleNavigate"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <div class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-700 text-sm font-semibold">
          <img
            v-if="post.users?.avatar_url"
            :src="post.users.avatar_url"
            :alt="displayName"
            class="h-full w-full object-cover"
          />
          <span v-else>{{ initials }}</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <p class="text-base font-semibold text-slate-100">{{ displayName }}</p>
            <span
              v-if="post.is_pinned"
              class="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-200"
            >
              Post fixado
            </span>
          </div>
          <p class="text-xs text-gray-400">{{ formattedDate }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs">
        <button
          type="button"
          v-if="isAdmin"
          @click.stop="handleTogglePin"
          :disabled="isPinning"
          class="rounded-full border border-cyan-500/50 px-3 py-1 font-semibold text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg v-if="isPinning" class="h-4 w-4 animate-spin text-cyan-200" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>{{ isPinning ? (post.is_pinned ? 'Desafixando...' : 'Fixando...') : (post.is_pinned ? 'Desafixar post' : 'Fixar post') }}</span>
        </button>
        <button
          type="button"
          v-if="isAdmin"
          @click.stop="handleDelete"
          class="rounded-full border border-red-500/50 px-3 py-1 font-semibold text-red-300 transition hover:border-red-400 hover:text-red-200"
        >
          Excluir
        </button>
        <button
          type="button"
          v-if="isOwner"
          @click.stop="handleEdit"
          class="rounded-full border border-blue-500/50 px-3 py-1 font-semibold text-blue-200 transition hover:border-blue-400 hover:text-blue-100"
        >
          Editar
        </button>
        <button
          type="button"
          v-if="isOwner"
          @click.stop="handleDeleteOwner"
          class="rounded-full border border-red-500/50 px-3 py-1 font-semibold text-red-300 transition hover:border-red-400 hover:text-red-200"
        >
          Excluir
        </button>
      </div>
    </div>

    <h3 v-if="post.title" class="mt-4 text-xl font-semibold text-slate-100">{{ post.title }}</h3>

    <p v-if="post.content" class="mt-3 text-sm text-gray-200 whitespace-pre-line">{{ post.content }}</p>

    <div v-if="post.image_url" class="mt-4 overflow-hidden rounded-xl border border-gray-800">
      <img
        :src="post.image_url"
        :alt="post.title || 'Imagem do post'"
        class="h-full w-full max-h-[28rem] object-cover"
        loading="lazy"
      />
    </div>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex items-center gap-2 rounded-full border px-3 py-1 font-semibold transition"
          :class="post.user_vote === 1 ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-emerald-500/50 hover:text-emerald-200'"
          @click.stop="handleVote(1, $event)"
        >
          <span class="text-sm">▲</span>
          <span>Curtir</span>
          <span class="ml-2 text-xs text-gray-400">{{ upvotes }}</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 rounded-full border px-3 py-1 font-semibold transition"
          :class="post.user_vote === -1 ? 'border-rose-500/60 bg-rose-500/10 text-rose-300' : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-rose-500/50 hover:text-rose-200'"
          @click.stop="handleVote(-1, $event)"
        >
          <span class="text-sm">▼</span>
          <span>Descurtir</span>
          <span class="ml-2 text-xs text-gray-400">{{ downvotes }}</span>
        </button>
      </div>

      <button
        @click.stop="handleFavorite"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold transition"
        :class="isFavorited ? 'border-amber-400/70 bg-amber-500/10 text-amber-200' : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-amber-400/60 hover:text-amber-100'"
      >
        <span>{{ isFavorited ? '★' : '☆' }}</span>
        <span>{{ isFavorited ? 'Favoritado' : 'Favoritar' }}</span>
      </button>
    </div>

    <div v-if="!compact" class="mt-5 space-y-4" data-stop-navigation>
      <ReactionBar :entity-id="post.id" entity-type="post" />
      <CommentSection :post-id="post.id" :post-owner-id="post.user_id" />
    </div>
  </article>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import { useRouter } from 'vue-router'
import ReactionBar from '@/components/ReactionBar.vue'
import CommentSection from '@/components/CommentSection.vue'

const props = defineProps({
  post: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['mounted', 'unmounted', 'delete'])

const rootEl = ref(null)
const authStore = useAuthStore()
const postsStore = usePostsStore()
const router = useRouter()
const isPinning = ref(false)

onMounted(() => {
  if (rootEl.value) {
    emit('mounted', rootEl.value)
  }
})

onBeforeUnmount(() => {
  emit('unmounted', props.post.id)
})

const displayName = computed(() => {
  return props.post.users?.username || props.post.users?.full_name || props.post.users?.email || 'Usuário'
})

const initials = computed(() => displayName.value.charAt(0).toUpperCase())

const formattedDate = computed(() => {
  const date = new Date(props.post.created_at)
  const now = new Date()
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))

  if (diffInHours < 1) return 'Agora'
  if (diffInHours < 24) return `${diffInHours}h atrás`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d atrás`

  return date.toLocaleDateString()
})

const voteSummary = computed(() => props.post.vote_summary || { upvotes: 0, downvotes: 0, score: 0 })

const score = computed(() => voteSummary.value.score ?? 0)
const upvotes = computed(() => voteSummary.value.upvotes ?? 0)
const downvotes = computed(() => voteSummary.value.downvotes ?? 0)

const isFavorited = computed(() => !!props.post.is_favorited)
const isAdmin = computed(() => (typeof authStore.isAdmin === 'boolean' ? authStore.isAdmin : !!authStore.isAdmin?.value))
const isOwner = computed(() => authStore.user?.id === props.post.user_id)

const cardClasses = computed(() => {
  const base = 'rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg shadow-black/30 backdrop-blur-sm transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
  if (props.post.is_pinned) {
    return [base, 'border-cyan-400/70 bg-cyan-500/10 animate-pin-glow']
  }
  return [base]
})

const handleNavigate = (event) => {
  if (!props.post?.id) return

  const currentRoute = router.currentRoute.value
  if (currentRoute?.name === 'PostDetails' && String(currentRoute.params?.id) === String(props.post.id)) {
    return
  }

  const target = event?.target
  if (target && typeof target.closest === 'function') {
    const interactive = target.closest('button, a, input, textarea, select, label, [data-stop-navigation]')
    if (interactive) {
      return
    }
  }

  try {
    window.dispatchEvent(new CustomEvent('close-all-popups'))
  } catch (e) {
    // ignore
  }

  router.push({ name: 'PostDetails', params: { id: props.post.id } })
}

const handleVote = async (value, event) => {
  const { success, error } = await postsStore.togglePostVote(props.post.id, value)
  if (!success && error) {
    window.alert(error)
  } else {
    // visual feedback: briefly scale the button to indicate the action
    try {
      gsap.fromTo(event.currentTarget, { scale: 1.1 }, { scale: 1, duration: 0.2, ease: 'power1.out' })
    } catch (e) {
      // ignore
    }
  }
}

const handleFavorite = async () => {
  const { success, error } = await postsStore.toggleFavorite(props.post.id)
  if (!success && error) {
    window.alert(error)
  }
}

  const handleTogglePin = async () => {
    if (isPinning.value) return
    // close any open popups (emoji picker, etc.) that may block the UI
    window.dispatchEvent(new CustomEvent('close-all-popups'))
    isPinning.value = true
    const { success, error } = await postsStore.togglePostPin(props.post.id, !props.post.is_pinned)
    isPinning.value = false
    if (!success && error) {
      window.alert(error)
    }
    // visual feedback: briefly pulse the card to indicate change
    try {
      if (rootEl.value) {
        gsap.fromTo(rootEl.value, { scale: 0.995 }, { scale: 1, duration: 0.18, ease: 'power1.out' })
      }
    } catch (e) {
      // ignore
    }
  }

const handleDelete = async () => {
  if (!isAdmin.value) return
  const confirmed = window.confirm('Deseja realmente excluir este post?')
  if (!confirmed) return

  const { success, error } = await postsStore.deletePost(props.post.id)
  if (!success && error) {
    window.alert(error)
  }
}

const handleEdit = () => {
  router.push({ name: 'PostDetails', params: { id: props.post.id }, query: { edit: 'true' } })
}

const handleDeleteOwner = () => {
  emit('delete', props.post.id)
}
</script>
