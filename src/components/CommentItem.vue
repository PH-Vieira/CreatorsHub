<template>
  <div class="space-y-3">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold overflow-hidden">
        <img
          v-if="comment.users?.avatar_url"
          :src="comment.users.avatar_url"
          :alt="displayName"
          class="w-full h-full object-cover"
        />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold">{{ displayName }}</p>
            <p class="text-xs text-gray-400">{{ formattedDate }}</p>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <button
              v-if="canDelete"
              @click="emit('delete', comment)"
              class="text-red-400 hover:text-red-300 transition"
            >
              Excluir
            </button>
            <button
              @click="emit('reply', comment)"
              class="text-cyan-400 hover:text-cyan-300 transition"
            >
              Responder
            </button>
          </div>
        </div>
        <p class="text-sm text-gray-200 mt-2">{{ comment.content }}</p>
      </div>
    </div>

    <div
      v-if="comment.children?.length"
      class="pl-8 border-l border-gray-700 space-y-3"
    >
      <CommentItem
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :can-delete="canDelete"
        @reply="emit('reply', $event)"
        @delete="emit('delete', $event)"
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
  }
})

const emit = defineEmits(['reply', 'delete'])

const displayName = computed(() => {
  return props.comment.users?.full_name || props.comment.users?.username || props.comment.users?.email || 'Usuário'
})

const initials = computed(() => displayName.value.charAt(0).toUpperCase())

const formattedDate = computed(() => {
  const date = new Date(props.comment.created_at)
  return date.toLocaleString()
})
</script>
