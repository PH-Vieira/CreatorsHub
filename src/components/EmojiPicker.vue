<template>
  <div class="emoji-picker-wrapper">
    <div v-if="!loaded" class="p-2 text-sm text-gray-400">Carregando emoji picker...</div>
    <!-- containerRef is always present so we can reliably append and size the picker -->
    <div ref="containerRef" class="emoji-picker-container"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'

const emit = defineEmits(['select'])
const loaded = ref(false)
const containerRef = ref(null)
let pickerEl = null
let onEmojiClick = null

onMounted(async () => {
  try {
    // dynamically import the web component (small, no framework binding required)
    await import('emoji-picker-element')

    // Ensure the container is mounted/rendered before appending
    loaded.value = true
    await nextTick()


    // create the element and append to container
    pickerEl = document.createElement('emoji-picker')
    // optional: show search and categories by attributes
    pickerEl.setAttribute('emoji-size', '20')
    pickerEl.setAttribute('preview-position', 'none')
    pickerEl.setAttribute('show-search', 'true')
    pickerEl.setAttribute('show-variants', 'true')

    // Ensure the picker sizes to its parent container to avoid overflow
    pickerEl.style.width = '100%'
    pickerEl.style.maxWidth = '100%'
    pickerEl.style.boxSizing = 'border-box'

    onEmojiClick = (e) => {
      // event.detail.unicode contains the emoji string
      const emoji = e.detail?.unicode || e.detail?.emoji || ''
      if (emoji) emit('select', emoji)
    }

    pickerEl.addEventListener('emoji-click', onEmojiClick)
    if (containerRef.value) {
      // make container fit parent and allow scrolling if needed
      containerRef.value.style.width = '100%'
      containerRef.value.style.overflow = 'auto'
      containerRef.value.appendChild(pickerEl)
    }
  } catch (err) {
    console.error('Failed to load emoji picker:', err)
    loaded.value = false
  }
})

onBeforeUnmount(() => {
  if (pickerEl && onEmojiClick) {
    pickerEl.removeEventListener('emoji-click', onEmojiClick)
  }
})
</script>

<style scoped>
.emoji-picker-wrapper {
  min-width: 12rem;
  max-width: 22rem;
}
</style>
