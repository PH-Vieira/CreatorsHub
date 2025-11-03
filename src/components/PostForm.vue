<template>
  <div class="bg-gray-800 p-6 rounded-lg border border-gray-700">
    <h3 class="text-white text-lg font-semibold mb-4">Criar novo post</h3>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
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

      <div>
        <label for="content" class="block text-gray-300 mb-2">Conteúdo</label>
        <textarea
          id="content"
          v-model="content"
          rows="3"
          class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          placeholder="Compartilhe algo com a comunidade"
        ></textarea>
      </div>

      <div>
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

      <div class="flex gap-3">
        <button
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
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'

const authStore = useAuthStore()
const postsStore = usePostsStore()

const emit = defineEmits(['success', 'cancel'])

const title = ref('')
const content = ref('')
const selectedFile = ref(null)
const fileError = ref('')
const submitting = ref(false)
const fileInput = ref(null)

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