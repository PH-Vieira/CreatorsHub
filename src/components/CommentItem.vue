<template>
  <div :class="containerClasses">
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-700 text-sm font-semibold">
        <img
          v-if="comment.users?.avatar_url"
          :src="comment.users.avatar_url"
          :alt="displayName"
          class="h-full w-full object-cover"
        />
        <span v-else>{{ initials }}</span>
      </div>

      <div class="flex-1">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-slate-100">{{ displayName }}</p>
              <span
                v-if="comment.is_pinned"
                class="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200"
              >
                Fixado
              </span>
            </div>
            <p class="text-xs text-gray-400">{{ formattedDate }}</p>
          </div>

          <div class="flex flex-col items-center text-xs text-gray-400">
            <button
              type="button"
              class="rounded-full p-1 transition"
              :class="comment.user_vote === 1 ? 'text-emerald-400 bg-emerald-500/10' : 'hover:text-emerald-300 hover:bg-emerald-500/10'"
              @click="handleVote(1)"
              aria-label="Curtir"
            >
              ▲
            </button>
            <span class="py-1 text-sm font-semibold text-slate-100">{{ score }}</span>
            <button
              type="button"
              class="rounded-full p-1 transition"
              :class="comment.user_vote === -1 ? 'text-rose-400 bg-rose-500/10' : 'hover:text-rose-300 hover:bg-rose-500/10'"
              @click="handleVote(-1)"
              aria-label="Descurtir"
            >
              ▼
            </button>
          </div>
        </div>

        <p class="mt-1 text-sm text-gray-200">{{ comment.content }}</p>

        <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <span class="rounded bg-gray-800/60 px-2 py-0.5 text-[11px] text-slate-200">
            {{ upvotes }} up · {{ downvotes }} down
          </span>

          <button
            type="button"
            v-if="canPin"
            @click="emit('toggle-pin', comment)"
            class="rounded-full border border-amber-400/40 px-3 py-1 font-semibold text-amber-200 transition hover:border-amber-300 hover:text-amber-100"
          >
            {{ comment.is_pinned ? 'Desafixar' : 'Fixar' }}
          </button>

          <button
            type="button"
            v-if="canDelete"
            @click="emit('delete', comment)"
            class="font-semibold text-red-400 transition hover:text-red-300"
          >
            Excluir
          </button>

          <button
            type="button"
            @click="emit('reply', comment)"
            class="font-semibold text-cyan-400 transition hover:text-cyan-300"
          >
            Responder
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="comment.children?.length"
      class="ml-6 border-l border-gray-700/60 pl-6"
    >
      <CommentItem
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :can-delete="canDelete"
        :can-pin="canPin"
        @reply="emit('reply', $event)"
        @delete="emit('delete', $event)"
        @vote="emit('vote', $event)"
        @toggle-pin="emit('toggle-pin', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({
  name: 'CommentItem'
})

const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  canDelete: {
    type: Boolean,
    default: false
  },
  canPin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['reply', 'delete', 'vote', 'toggle-pin'])

const displayName = computed(() => {
  return props.comment.users?.username || props.comment.users?.full_name || props.comment.users?.email || 'Usuário'
})

const initials = computed(() => displayName.value.charAt(0).toUpperCase())

const formattedDate = computed(() => {
  const date = new Date(props.comment.created_at)
  return date.toLocaleString()
})

const score = computed(() => props.comment.vote_summary?.score ?? 0)
const upvotes = computed(() => props.comment.vote_summary?.upvotes ?? 0)
const downvotes = computed(() => props.comment.vote_summary?.downvotes ?? 0)

const containerClasses = computed(() => [
  'space-y-4 rounded-2xl px-4 py-4 transition',
  props.comment.is_pinned
    ? 'bg-amber-500/10 shadow-lg shadow-amber-500/20 animate-pin-glow'
    : 'bg-gray-900/40 shadow-inner shadow-black/20'
])

const handleVote = (value) => {
  emit('vote', { commentId: props.comment.id, value })
}
</script>
