<template>
  <div ref="formContainer" class="rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-lg shadow-black/30 backdrop-blur-sm">
    <h3 class="text-white text-lg font-semibold mb-4">Criar novo post</h3>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div ref="titleGroup">
        <label for="title" class="block text-gray-300 mb-2">Título</label>
        <input
          id="title"
          v-model="title"
          type="text"
          required
          class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Digite o título do post"
        />
      </div>

      <div ref="contentGroup">
        <label for="content" class="block text-gray-300 mb-2">Conteúdo</label>
        <textarea
          id="content"
          v-model="content"
          rows="3"
          class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          placeholder="Compartilhe algo com a comunidade"
        ></textarea>
      </div>

      <div ref="summaryGroup">
        <label for="summary" class="block text-gray-300 mb-2">Resumo (opcional)</label>
        <textarea
          id="summary"
          v-model="summary"
          rows="2"
          class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          placeholder="Um breve resumo do post"
        ></textarea>
      </div>

      <div ref="imageGroup">
        <label for="image" class="block text-gray-300 mb-2">Imagem (opcional)</label>
        <input
          id="image"
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileSelect"
          class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
        />
        <p v-if="selectedFile" class="text-sm text-gray-400 mt-1">
          Selecionado: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
        </p>
        <p v-if="fileError" class="text-sm text-red-500 mt-1">{{ fileError }}</p>
      </div>

      <div ref="buttonsGroup" class="flex gap-3">
        <button
          ref="submitBtn"
          type="submit"
          :disabled="submitting || !title.trim()"
          class="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-white py-2 rounded font-semibold transition"
        >
          {{ submitting ? 'Publicando...' : 'Publicar' }}
        </button>
        <button
          type="button"
          @click="handleCancel"
          :disabled="submitting"
          class="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600/60 text-white rounded font-semibold transition"
        >
          Cancelar
        </button>
      </div>
    </form>

    <!-- Preview Section -->
    <div v-if="previewData.title || previewData.content" ref="previewSection" class="mt-6 pt-6 border-t border-gray-700">
      <h4 class="text-gray-300 text-sm font-semibold mb-3">Pré-visualização</h4>
      <div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4 shadow-md">
        <div class="flex items-start gap-3 mb-3">
          <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-700 text-xs font-semibold">
            <span>{{ authStore.user?.username?.charAt(0).toUpperCase() || 'U' }}</span>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-100">{{ authStore.user?.username || 'Usuário' }}</p>
            <p class="text-xs text-gray-400">Agora</p>
          </div>
        </div>
        <h3 v-if="previewData.title" class="text-lg font-semibold text-slate-100 mb-2">{{ previewData.title }}</h3>
        <p v-if="previewData.summary" class="text-sm text-gray-300 italic mb-2">{{ previewData.summary }}</p>
        <p v-if="previewData.content" class="text-sm text-gray-200 whitespace-pre-line mb-3">{{ previewData.content }}</p>
        <div v-if="previewData.imageUrl" class="overflow-hidden rounded-lg border border-gray-800">
          <img :src="previewData.imageUrl" alt="Preview" class="h-full w-full max-h-48 object-cover" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'

const authStore = useAuthStore()
const postsStore = usePostsStore()

const emit = defineEmits(['success', 'cancel'])

const title = ref('')
const content = ref('')
const summary = ref('')
const selectedFile = ref(null)
const fileError = ref('')
const submitting = ref(false)
const fileInput = ref(null)

const formContainer = ref(null)
const titleGroup = ref(null)
const contentGroup = ref(null)
const summaryGroup = ref(null)
const imageGroup = ref(null)
const buttonsGroup = ref(null)
const submitBtn = ref(null)
const previewSection = ref(null)

const previewData = computed(() => ({
  title: title.value.trim(),
  content: content.value.trim(),
  summary: summary.value.trim(),
  imageUrl: selectedFile.value ? URL.createObjectURL(selectedFile.value) : null
}))

watch(previewData, () => {
  if (previewSection.value && (previewData.value.title || previewData.value.content)) {
    gsap.fromTo(previewSection.value, { opacity: 0.5, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' })
  }
}, { deep: true })

onMounted(() => {
  if (formContainer.value) {
    gsap.set([titleGroup.value, contentGroup.value, summaryGroup.value, imageGroup.value, buttonsGroup.value], { opacity: 0, y: 20 })
    gsap.to([titleGroup.value, contentGroup.value, summaryGroup.value, imageGroup.value, buttonsGroup.value], {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out'
    })
  }
})

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) {
    selectedFile.value = null
    fileError.value = ''
    return
  }

  // Validate file size (50MB limit)
  const maxSize = 50 * 1024 * 1024 // 50MB in bytes
  if (file.size > maxSize) {
    fileError.value = 'O arquivo deve ter no máximo 50MB'
    selectedFile.value = null
    fileInput.value.value = ''
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    fileError.value = 'Somente arquivos de imagem são permitidos'
    selectedFile.value = null
    fileInput.value.value = ''
    return
  }

  selectedFile.value = file
  fileError.value = ''
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleSubmit = async () => {
  if (!authStore.user) return

  submitting.value = true
  fileError.value = ''

  // Animate submit button
  if (submitBtn.value) {
    gsap.to(submitBtn.value, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.inOut' })
  }

  try {
    let imageUrl = null
    let imageSize = null

    if (selectedFile.value) {
      const uploadResult = await postsStore.uploadImage(selectedFile.value)
      if (!uploadResult.success) {
        fileError.value = uploadResult.error
        return
      }
      imageUrl = uploadResult.url
      imageSize = uploadResult.size
    }

    const postData = {
      user_id: authStore.user.id,
      title: title.value.trim(),
      content: content.value.trim() || null,
      summary: summary.value.trim() || null,
      image_url: imageUrl
    }

    const result = await postsStore.createPost(postData)
    if (result.success) {
      clearForm()
      emit('success', result.data)
    } else {
      fileError.value = result.error
    }
  } catch (error) {
    fileError.value = 'Não foi possível criar o post'
    console.error('Error creating post:', error)
  } finally {
    submitting.value = false
  }
}

const clearForm = () => {
  title.value = ''
  content.value = ''
  summary.value = ''
  selectedFile.value = null
  fileError.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleCancel = () => {
  if (submitting.value) return
  clearForm()
  emit('cancel')
}
</script>