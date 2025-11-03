<template>
  <article ref="rootEl" :class="cardClasses">
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
          v-if="isAdmin"
          @click="handleTogglePin"
          class="rounded-full border border-cyan-500/50 px-3 py-1 font-semibold text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
        >
          {{ post.is_pinned ? 'Desafixar post' : 'Fixar post' }}
        </button>
        <button
          v-if="isAdmin"
          @click="handleDelete"
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
          class="flex items-center gap-1 rounded-full border px-3 py-1 font-semibold transition"
          :class="post.user_vote === 1 ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-emerald-500/50 hover:text-emerald-200'"
          @click="handleVote(1)"
        >
          ▲
          <span>Upvote</span>
        </button>
        <span class="rounded-full border border-gray-700 bg-gray-900/60 px-3 py-1 text-slate-200">
          Score {{ score }} · {{ upvotes }}↑ / {{ downvotes }}↓
        </span>
        <button
          class="flex items-center gap-1 rounded-full border px-3 py-1 font-semibold transition"
          :class="post.user_vote === -1 ? 'border-rose-500/60 bg-rose-500/10 text-rose-300' : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-rose-500/50 hover:text-rose-200'"
          @click="handleVote(-1)"
        >
          ▼
          <span>Downvote</span>
        </button>
      </div>

      <button
        @click="handleFavorite"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold transition"
        :class="isFavorited ? 'border-amber-400/70 bg-amber-500/10 text-amber-200' : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-amber-400/60 hover:text-amber-100'"
      >
        <span>{{ isFavorited ? '★' : '☆' }}</span>
        <span>{{ isFavorited ? 'Favoritado' : 'Favoritar' }}</span>
      </button>
    </div>

    <div class="mt-5 space-y-4">
      <ReactionBar :entity-id="post.id" entity-type="post" />
      <CommentSection :post-id="post.id" :post-owner-id="post.user_id" />
    </div>
  </article>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import ReactionBar from '@/components/ReactionBar.vue'
import CommentSection from '@/components/CommentSection.vue'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['mounted', 'unmounted'])

const rootEl = ref(null)
const authStore = useAuthStore()
const postsStore = usePostsStore()

onMounted(() => {
  if (rootEl.value) {
    emit('mounted', rootEl.value)
  }
})

onBeforeUnmount(() => {
  emit('unmounted', props.post.id)
})

const displayName = computed(() => {
  return props.post.users?.full_name || props.post.users?.username || props.post.users?.email || 'Usuário'
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

const cardClasses = computed(() => {
  const base = 'rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg shadow-black/30 backdrop-blur-sm transition'
  if (props.post.is_pinned) {
    return [base, 'border-cyan-400/70 bg-cyan-500/10 animate-pin-glow']
  }
  return [base]
})

const handleVote = async (value) => {
  const { success, error } = await postsStore.togglePostVote(props.post.id, value)
  if (!success && error) {
    window.alert(error)
  }
}

const handleFavorite = async () => {
  const { success, error } = await postsStore.toggleFavorite(props.post.id)
  if (!success && error) {
    window.alert(error)
  }
}

const handleTogglePin = async () => {
  const { success, error } = await postsStore.togglePostPin(props.post.id, !props.post.is_pinned)
  if (!success && error) {
    window.alert(error)
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
</script>
