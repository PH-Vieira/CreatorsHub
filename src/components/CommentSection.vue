<template>
  <section class="mt-4 border-t border-gray-700 pt-4">
    <button
      class="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition"
      @click="toggle"
    >
      <span>{{ isExpanded ? 'Ocultar comentários' : 'Mostrar comentários' }}</span>
      <span class="text-gray-400">({{ commentCount }})</span>
    </button>

    <div v-if="isExpanded" class="mt-4 space-y-4">
      <div v-if="loading" class="text-sm text-gray-400">Carregando comentários...</div>
      <div v-else>
        <div v-if="commentsTree.length" class="space-y-4">
          <CommentItem
            v-for="comment in commentsTree"
            :key="comment.id"
            :comment="comment"
            :can-delete="canModerate"
            :can-pin="canPinComments"
            @reply="handleReply"
            @delete="handleDelete"
            @vote="handleVote"
            @toggle-pin="handlePin"
          />
        </div>
        <p v-else class="text-sm text-gray-400">Nenhum comentário ainda. Seja o primeiro!</p>
      </div>

      <div class="bg-gray-900/40 border border-gray-800 rounded-lg p-4 space-y-3">
        <div v-if="replyingTo" class="flex items-center justify-between text-xs text-gray-300">
          <p>
            Respondendo a <span class="text-cyan-400">{{ replyingLabel }}</span>
          </p>
          <button @click="cancelReply" class="text-red-400 hover:text-red-300 transition">
            Cancelar
          </button>
        </div>

        <textarea
          v-model="newComment"
          rows="3"
          class="w-full px-3 py-2 bg-gray-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Escreva um comentário..."
        ></textarea>
        <div class="flex justify-between items-center">
          <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>
          <button
            @click="submitComment"
            :disabled="submitting || !newComment.trim()"
            class="ml-auto px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-white rounded font-semibold transition"
          >
            {{ submitting ? 'Enviando...' : 'Comentar' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCommentsStore } from '@/stores/comments'
import { useAuthStore } from '@/stores/auth'
import CommentItem from '@/components/CommentItem.vue'

const props = defineProps({
  postId: {
    type: String,
    required: true
  },
  postOwnerId: {
    type: String,
    required: true
  }
})

const commentsStore = useCommentsStore()
const authStore = useAuthStore()

const isExpanded = ref(false)
const newComment = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const replyingTo = ref(null)

const commentCount = computed(() => commentsStore.getCommentCount(props.postId))
const loading = computed(() => commentsStore.isLoading(props.postId))
const canModerate = computed(() => authStore.profile?.role?.includes('admin') || authStore.profile?.role?.includes('moderator'))
const resolvedIsAdmin = computed(() => (typeof authStore.isAdmin === 'boolean' ? authStore.isAdmin : !!authStore.isAdmin?.value))
const canPinComments = computed(() => authStore.user?.id === props.postOwnerId || resolvedIsAdmin.value)

const rawComments = computed(() => commentsStore.getCommentsForPost(props.postId))

const commentsTree = computed(() => {
  const list = rawComments.value
  if (!list.length) return []

  const nodes = list.map((comment) => ({ ...comment, children: [] }))
  const map = new Map(nodes.map((node) => [node.id, node]))
  const roots = []

  nodes.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id).children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortFn = (a, b) => {
    const pinnedDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned)
    if (pinnedDiff !== 0) return pinnedDiff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  }

  const sortRecursive = (items) => {
    items.sort(sortFn)
    items.forEach((child) => {
      if (child.children?.length) {
        sortRecursive(child.children)
      }
    })
  }

  sortRecursive(roots)
  return roots
})

onMounted(() => {
  commentsStore.ensureCommentCount(props.postId)
})

const replyingLabel = computed(() => {
  if (!replyingTo.value) return ''
  return (
    replyingTo.value.users?.full_name ||
    replyingTo.value.users?.username ||
    replyingTo.value.users?.email ||
    'Usuário'
  )
})

const ensureLoaded = async () => {
  if (!commentsStore.hasLoaded(props.postId)) {
    await commentsStore.fetchComments(props.postId)
  }
}

const toggle = async () => {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) {
    await ensureLoaded()
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) return

  submitting.value = true
  errorMessage.value = ''

  const { success, error } = await commentsStore.addComment(
    props.postId,
    newComment.value,
    replyingTo.value?.id || null
  )

  submitting.value = false

  if (!success) {
    errorMessage.value = error || 'Não foi possível enviar o comentário'
    return
  }

  newComment.value = ''
  replyingTo.value = null
  errorMessage.value = ''
}

const handleReply = (comment) => {
  replyingTo.value = comment
}

const cancelReply = () => {
  replyingTo.value = null
}

const handleDelete = async (comment) => {
  const confirmed = window.confirm('Deseja excluir este comentário?')
  if (!confirmed) return

  const { success, error } = await commentsStore.deleteComment(comment.id)
  if (!success) {
    window.alert(error || 'Erro ao excluir comentário')
  }
}

const handleVote = async ({ commentId, value }) => {
  const result = await commentsStore.toggleCommentVote(props.postId, commentId, value)
  if (!result.success && result.error) {
    window.alert(result.error)
  }
}

const handlePin = async (comment) => {
  if (!canPinComments.value) return
  const shouldPin = !comment.is_pinned
  const result = await commentsStore.toggleCommentPin(props.postId, comment.id, shouldPin)
  if (!result.success && result.error) {
    window.alert(result.error)
  }
}
</script>
```