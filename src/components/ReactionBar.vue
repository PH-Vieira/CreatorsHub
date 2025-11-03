<template>
  <div class="mt-3">
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="emoji in displayedEmojis"
        :key="emoji"
        class="flex items-center gap-2 px-3 py-1 rounded-full border transition text-sm"
        :class="[
          reactionData.userReactions.includes(emoji)
            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-cyan-500/40 hover:text-cyan-200'
        ]"
        @click="handleToggle(emoji)"
        :disabled="reactionsStore.isLoading(entityId, entityType) || toggling"
      >
        <span>{{ emoji }}</span>
        <span class="text-xs text-gray-400">{{ reactionData.counts[emoji] || 0 }}</span>
      </button>

      <span v-if="!displayedEmojis.length" class="text-xs text-gray-500">
        Seja o primeiro a reagir
      </span>

      <div class="relative">
        <button
          class="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-300 text-sm hover:border-cyan-500/40 hover:text-cyan-200 transition"
          @click.stop="togglePicker"
          :disabled="reactionsStore.isLoading(entityId, entityType) || toggling"
        >
          <span>Adicionar reação</span>
          <span>+</span>
        </button>

        <transition name="fade">
          <div
            v-if="showPicker"
            ref="pickerRef"
            class="absolute z-20 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-xl"
          >
            <p class="text-xs text-gray-400 mb-2">Escolha um emoji</p>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="emoji in reactionsStore.availableEmojis"
                :key="emoji"
                class="flex items-center justify-center rounded bg-gray-800 py-2 text-lg hover:bg-cyan-500/20 transition"
                @click.stop="handleSelect(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </transition>
      </div>

      <span v-if="totalCount" class="text-xs text-gray-500">
        {{ totalCount }} {{ totalCount === 1 ? 'reação' : 'reações' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useReactionsStore } from '@/stores/reactions'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  entityId: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    default: 'post'
  }
})

const reactionsStore = useReactionsStore()
const authStore = useAuthStore()
const toggling = ref(false)
const showPicker = ref(false)
const pickerRef = ref(null)

const loadReactions = async () => {
  await reactionsStore.fetchReactions(props.entityId, props.entityType)
}

const reactionData = computed(() => reactionsStore.getReactionData(props.entityId, props.entityType))
const displayedEmojis = computed(() => {
  const counts = reactionData.value.counts || {}
  return Object.keys(counts).filter((emoji) => (counts[emoji] || 0) > 0)
})
const totalCount = computed(() => reactionData.value.total || 0)

const closePicker = () => {
  showPicker.value = false
}

const handleOutsideClick = (event) => {
  if (!showPicker.value) return
  if (pickerRef.value && !pickerRef.value.contains(event.target)) {
    closePicker()
  }
}

const togglePicker = () => {
  showPicker.value = !showPicker.value
}

const handleSelect = async (emoji) => {
  closePicker()
  await handleToggle(emoji)
}

onMounted(() => {
  loadReactions()
  window.addEventListener('click', handleOutsideClick)
})

watch(
  () => authStore.user?.id,
  () => {
    loadReactions()
  }
)

watch(showPicker, (visible) => {
  if (!visible) {
    closePicker()
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
})

const handleToggle = async (emoji) => {
  if (toggling.value) return
  toggling.value = true
  const { success, error } = await reactionsStore.toggleReaction(props.entityId, emoji, props.entityType)
  toggling.value = false

  if (!success && error) {
    window.alert(error)
  }
}
</script>
