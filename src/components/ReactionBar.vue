<template>
  <div class="mt-3">
    <div class="flex flex-wrap items-center gap-2">
      <!-- existing reactions -->
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
          type="button"
          class="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-300 text-sm hover:border-cyan-500/40 hover:text-cyan-200 transition"
          @click.stop="togglePicker"
          ref="toggleBtnRef"
          :disabled="reactionsStore.isLoading(entityId, entityType) || toggling"
        >
          <template v-if="reactionsStore.isLoading(entityId, entityType) || toggling">
            <svg class="h-4 w-4 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span class="text-xs text-gray-300">Carregando</span>
          </template>
          <template v-else>
            <span>Adicionar reação</span>
            <span>+</span>
          </template>
        </button>

        <transition name="fade">
          <teleport to="body">
            <div v-if="showPicker" ref="pickerRef" :style="popupStyle" class="z-[2147483000] w-80 max-w-[90vw] rounded-lg bg-gray-900 p-3 shadow-xl">
              <div :class="positionAbove.value ? 'picker-caret down' : 'picker-caret up'"></div>
              <p class="text-xs text-gray-400 mb-2">Escolha um emoji</p>
              <EmojiPicker @select="handleSelect" />
            </div>
          </teleport>
        </transition>
      </div>

      <span v-if="totalCount" class="text-xs text-gray-500">
        {{ totalCount }} {{ totalCount === 1 ? 'reação' : 'reações' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useReactionsStore } from '@/stores/reactions'
import { useAuthStore } from '@/stores/auth'
import EmojiPicker from './EmojiPicker.vue'

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
const toggleBtnRef = ref(null)
const positionAbove = ref(false)
const popupStyle = ref({ position: 'fixed', left: '0px', top: '0px', opacity: 0 })
const resizeObserver = ref(null)
let recalcTimeouts = []

const updatePickerPosition = async () => {
  if (!toggleBtnRef.value || !pickerRef.value) return
  await nextTick()
  const btnRect = toggleBtnRef.value.getBoundingClientRect()
  const pickerEl = pickerRef.value
  // measure expected height (offsetHeight may be 0 if not rendered fully yet)
  const pickerHeight = pickerEl.offsetHeight || pickerEl.getBoundingClientRect().height || 260
  const spaceBelow = window.innerHeight - btnRect.bottom
  const spaceAbove = btnRect.top
  // leave 12px margin
  positionAbove.value = spaceBelow < pickerHeight + 12 && spaceAbove > pickerHeight + 12
  // compute left/top for teleport-fixed popup and set style
  const pickerWidth = pickerEl.offsetWidth || pickerEl.getBoundingClientRect().width || 320
  let left = btnRect.left
  // ensure popup doesn't overflow right edge
  left = Math.max(8, Math.min(left, window.innerWidth - pickerWidth - 8))
  let top
  if (positionAbove.value) {
    top = btnRect.top - pickerHeight - 8
  } else {
    top = btnRect.bottom + 8
  }
  popupStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    zIndex: 2147483000,
    opacity: 1
  }
}

const loadReactions = async () => {
  await reactionsStore.fetchReactions(props.entityId, props.entityType)
}

const reactionData = computed(() => reactionsStore.getReactionData(props.entityId, props.entityType))
const displayedEmojis = computed(() => {
  const counts = reactionData.value.counts || {}
  return Object.keys(counts)
    .filter((emoji) => (counts[emoji] || 0) > 0)
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
    .slice(0, 5)
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

const togglePicker = async () => {
  showPicker.value = !showPicker.value
  if (showPicker.value) {
    await updatePickerPosition()
  }
}

const handleSelect = async (emoji) => {
  closePicker()
  await handleToggle(emoji)
}

onMounted(() => {
  loadReactions()
  window.addEventListener('click', handleOutsideClick)
  // close picker when other actions request it (e.g., pin/unpin elsewhere)
  window.addEventListener('close-all-popups', closePicker)
})

// Update position on resize/scroll when picker is open
watch(showPicker, (visible) => {
  if (visible) {
    window.addEventListener('resize', updatePickerPosition)
    window.addEventListener('scroll', updatePickerPosition, true)
    // if the picker element resizes (emoji picker lazy-loads), recalc position
    // attach a ResizeObserver after nextTick so pickerRef is present
    nextTick().then(() => {
      if (pickerRef.value && !resizeObserver.value) {
        resizeObserver.value = new ResizeObserver(() => {
          updatePickerPosition()
        })
        resizeObserver.value.observe(pickerRef.value)
      }
      // schedule a couple of delayed recalculations to catch lazy-loaded content
      recalcTimeouts.push(setTimeout(updatePickerPosition, 100))
      recalcTimeouts.push(setTimeout(updatePickerPosition, 300))
    })
  } else {
    window.removeEventListener('resize', updatePickerPosition)
    window.removeEventListener('scroll', updatePickerPosition, true)
    if (resizeObserver.value) {
      try { resizeObserver.value.disconnect() } catch (e) {}
      resizeObserver.value = null
    }
    // clear any pending recalculation timeouts
    recalcTimeouts.forEach((id) => clearTimeout(id))
    recalcTimeouts = []
  }
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
  if (resizeObserver.value) {
    try { resizeObserver.value.disconnect() } catch (e) {}
    resizeObserver.value = null
  }
  recalcTimeouts.forEach((id) => clearTimeout(id))
  recalcTimeouts = []
  window.removeEventListener('close-all-popups', closePicker)
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

<style scoped>
.picker-caret {
  width: 0;
  height: 0;
  position: absolute;
  left: 18px;
}
.picker-caret.up {
  top: -8px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #0f172a; /* match bg-gray-900 */
}
.picker-caret.down {
  bottom: -8px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #0f172a;
}
</style>
