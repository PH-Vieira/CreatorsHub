<template>
  <div class="min-h-screen bg-black text-white">
    <header class="bg-gray-800 p-4 border-b border-gray-700">
      <div class="max-w-2xl mx-auto flex items-center justify-between">
        <h1 class="text-2xl font-bold text-cyan-400">Meu Perfil</h1>
        <button
          @click="goBack"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition"
        >
          Voltar
        </button>
      </div>
    </header>

    <main class="max-w-2xl mx-auto p-4">
      <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-6">
        <div class="flex items-center gap-4">
          <div class="relative">
            <img
              v-if="form.avatar_url"
              :src="form.avatar_url"
              alt="Avatar"
              class="w-20 h-20 rounded-full object-cover border border-gray-600"
            />
            <div
              v-else
              class="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-xl font-semibold"
            >
              {{ fallbackInitials }}
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-400 mb-2">Foto de perfil</p>
            <label class="inline-flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded cursor-pointer transition">
              <input type="file" accept="image/*" class="hidden" @change="handleAvatarSelect" />
              {{ avatarUploading ? 'Enviando...' : 'Trocar imagem' }}
            </label>
            <p v-if="avatarError" class="text-red-500 text-sm mt-2">{{ avatarError }}</p>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="username" class="block text-gray-300 mb-2">Nome de usuário</label>
              <input
                id="username"
                v-model="form.username"
                type="text"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="ex: junior Jr."
              />
            </div>
            <div>
              <label for="full_name" class="block text-gray-300 mb-2">Nome completo</label>
              <input
                id="full_name"
                v-model="form.full_name"
                type="text"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="phone" class="block text-gray-300 mb-2">Telefone</label>
              <input
                id="phone"
                v-model="form.phone"
                type="tel"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label for="document" class="block text-gray-300 mb-2">Documento</label>
              <input
                id="document"
                v-model="form.document"
                type="text"
                class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="CPF/CNPJ"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="saving"
            class="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-white py-2 rounded font-semibold transition"
          >
            {{ saving ? 'Salvando...' : 'Salvar alterações' }}
          </button>
        </form>

        <p v-if="successMessage" class="text-green-500 text-sm">{{ successMessage }}</p>
        <p v-if="formError" class="text-red-500 text-sm">{{ formError }}</p>
      </div>

      <div class="mt-8">
        <h2 class="text-xl font-bold text-cyan-400 mb-4">Meus Posts</h2>
        <div v-if="postsStore.loadingUserPosts" class="text-center text-gray-400">Carregando posts...</div>
        <div v-else-if="postsStore.userPosts.length === 0" class="text-gray-400">Você ainda não criou nenhum post.</div>
        <div v-else class="space-y-4">
          <div v-for="post in postsStore.userPosts" :key="post.id" class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 class="font-semibold text-white">{{ post.title }}</h3>
            <p class="text-sm text-gray-300 mt-2">{{ post.content }}</p>
            <div class="mt-4 flex gap-2">
              <button @click="openEditModal(post)" class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition">Editar</button>
              <button @click="confirmDelete(post.id)" class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition">Excluir</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Modal -->
    <div v-if="editingPost" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full mx-4">
        <h3 class="text-lg font-bold text-cyan-400 mb-4">Editar Post</h3>
        <form @submit.prevent="saveEdit">
          <div class="mb-4">
            <label for="edit-title" class="block text-gray-300 mb-2">Título</label>
            <input
              id="edit-title"
              v-model="editForm.title"
              type="text"
              class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
          <div class="mb-4">
            <label for="edit-content" class="block text-gray-300 mb-2">Conteúdo</label>
            <textarea
              id="edit-content"
              v-model="editForm.content"
              class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows="4"
              required
            ></textarea>
          </div>
          <div class="flex gap-2">
            <button type="submit" :disabled="savingEdit" class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-white rounded transition">
              {{ savingEdit ? 'Salvando...' : 'Salvar' }}
            </button>
            <button type="button" @click="closeEditModal" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import { onMounted } from 'vue'

const router = useRouter()
const authStore = useAuthStore()
const postsStore = usePostsStore()

const form = reactive({
  username: '',
  full_name: '',
  phone: '',
  document: '',
  avatar_url: ''
})

const saving = ref(false)
const successMessage = ref('')
const formError = ref('')
const avatarError = ref('')
const avatarUploading = ref(false)
const editingPost = ref(null)
const editForm = reactive({ title: '', content: '' })
const savingEdit = ref(false)

watch(
  () => authStore.profile,
  (profile) => {
    if (!profile) return
    form.username = profile.username ?? ''
    form.full_name = profile.full_name ?? ''
    form.phone = profile.phone ?? ''
    form.document = profile.document ?? ''
    form.avatar_url = profile.avatar_url ?? ''
  },
  { immediate: true }
)

onMounted(async () => {
  if (authStore.user) {
    await postsStore.fetchUserPosts(authStore.user.id)
  }
})

const fallbackInitials = computed(() => {
  const source = form.full_name || form.username || authStore.user?.email || 'U'
  return source.charAt(0).toUpperCase()
})

const handleAvatarSelect = async (event) => {
  const file = event.target.files?.[0]
  avatarError.value = ''
  successMessage.value = ''
  if (!file) return

  avatarUploading.value = true
  const result = await authStore.uploadAvatar(file)
  avatarUploading.value = false

  if (!result.success) {
    avatarError.value = result.error || 'Erro ao enviar imagem'
    return
  }

  form.avatar_url = result.url
  const updateResult = await authStore.updateProfile({ avatar_url: result.url })
  if (!updateResult.success) {
    avatarError.value = updateResult.error || 'Erro ao atualizar avatar'
  } else {
    successMessage.value = 'Avatar atualizado com sucesso'
    avatarError.value = ''
  }
}

const handleSubmit = async () => {
  if (!authStore.user) {
    formError.value = 'Você precisa estar autenticado'
    return
  }

  saving.value = true
  formError.value = ''
  successMessage.value = ''

  const updates = {
    username: form.username?.trim() || null,
    full_name: form.full_name?.trim() || null,
    phone: form.phone?.trim() || null,
    document: form.document?.trim() || null,
    avatar_url: form.avatar_url || null
  }

  const { success, error } = await authStore.updateProfile(updates)
  saving.value = false

  if (!success) {
    formError.value = error || 'Não foi possível atualizar o perfil'
    return
  }

  successMessage.value = 'Perfil atualizado com sucesso'
}

const goBack = () => {
  router.back()
}

const openEditModal = (post) => {
  editingPost.value = post
  editForm.title = post.title
  editForm.content = post.content
}

const closeEditModal = () => {
  editingPost.value = null
  editForm.title = ''
  editForm.content = ''
}

const saveEdit = async () => {
  if (!editingPost.value) return
  savingEdit.value = true
  const { success, error } = await postsStore.updatePost(editingPost.value.id, {
    title: editForm.title,
    content: editForm.content
  })
  savingEdit.value = false
  if (success) {
    closeEditModal()
    await postsStore.fetchUserPosts(authStore.user.id)
  } else {
    alert('Erro ao salvar: ' + error)
  }
}

const confirmDelete = async (postId) => {
  if (confirm('Tem certeza que deseja excluir este post?')) {
    const { success, error } = await postsStore.deletePost(postId)
    if (success) {
      await postsStore.fetchUserPosts(authStore.user.id)
    } else {
      alert('Erro ao excluir: ' + error)
    }
  }
}
</script>
```