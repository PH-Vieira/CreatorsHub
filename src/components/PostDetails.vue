<template>
  <div class="min-h-screen bg-black text-white">
    <NavigationBar @create-post="openPostModal" @logout="handleLogout" />

    <main class="mx-auto max-w-5xl px-4 py-8 lg:px-6 lg:py-12">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-cyan-400/60 hover:text-cyan-100"
        @click="goBack"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Voltar para o feed
      </button>

      <section v-if="isLoading" class="mt-20 flex flex-col items-center gap-4 text-sm text-gray-400">
        <svg class="h-8 w-8 animate-spin text-cyan-300" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        Carregando post completo...
      </section>

      <section v-else-if="errorMessage" class="mt-16 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-200">
        {{ errorMessage }}
      </section>

      <article v-else class="mt-10 space-y-10">
        <header class="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div class="flex flex-wrap items-start justify-between gap-6">
            <div class="flex items-start gap-4">
              <div class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gray-800 text-lg font-semibold">
                <img
                  v-if="post.users?.avatar_url"
                  :src="post.users.avatar_url"
                  :alt="displayName"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ initials }}</span>
              </div>
              <div>
                <div class="flex items-center gap-3">
                  <div v-if="isEditing" class="flex-1">
                    <input
                      v-model="editForm.title"
                      type="text"
                      class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-2xl font-semibold"
                      placeholder="Título do post"
                    />
                  </div>
                  <div v-else>
                    <h1 class="text-2xl font-semibold text-slate-100">{{ post.title || 'Post sem título' }}</h1>
                  </div>
                  <span
                    v-if="post.is_pinned"
                    class="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200"
                  >
                    Post fixado
                  </span>
                  <div v-if="isOwner && !isEditing" class="flex gap-2">
                    <button @click="openEditModal" class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition">Editar</button>
                    <button @click="confirmDelete" class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition">Excluir</button>
                  </div>
                  <div v-if="isEditing" class="flex gap-2">
                    <button @click="saveEdit" :disabled="savingEdit" class="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded text-sm transition">
                      {{ savingEdit ? 'Salvando...' : 'Salvar' }}
                    </button>
                    <button @click="closeEditModal" class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition">Cancelar</button>
                  </div>
                </div>
                <p class="mt-1 text-sm text-gray-400">
                  Publicado por <span class="font-semibold text-slate-100">{{ displayName }}</span>
                  <span class="mx-1">•</span>
                  <span>{{ detailedDate }}</span>
                </p>
                <p v-if="post.subtitle" class="mt-3 text-base text-gray-300">{{ post.subtitle }}</p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-3 text-sm text-gray-300">
              <div class="flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs uppercase tracking-[0.3em] text-gray-500">Upvotes</span>
                  <span class="text-base font-semibold text-emerald-300">{{ upvotes }}</span>
                </div>
                <div class="h-4 w-px bg-white/10"></div>
                <div class="flex items-center gap-2">
                  <span class="text-xs uppercase tracking-[0.3em] text-gray-500">Downvotes</span>
                  <span class="text-base font-semibold text-rose-300">{{ downvotes }}</span>
                </div>
              </div>
              <div class="text-xs text-gray-500">
                Comentários: <span class="font-semibold text-gray-300">{{ commentCount }}</span>
              </div>
            </div>
          </div>
        </header>

        <section class="grid gap-10 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
          <div class="space-y-8">
            <div v-if="heroVideo" class="overflow-hidden rounded-3xl border border-white/10 bg-black/40 relative">
              <video
                :src="heroVideo"
                controls
                playsinline
                class="h-full w-full max-h-[520px] rounded-3xl object-cover"
              ></video>
              <button v-if="isEditing" @click="deleteMedia('video')" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div v-else-if="heroImage" class="overflow-hidden rounded-3xl border border-white/10 bg-black/40 relative">
              <img
                :src="heroImage.url"
                :alt="heroImage.alt"
                class="h-full w-full max-h-[520px] object-cover"
                loading="lazy"
              />
              <button v-if="isEditing" @click="deleteMedia('image', heroImage.url)" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div v-if="additionalImages.length" class="grid gap-4 sm:grid-cols-2">
              <figure
                v-for="image in additionalImages"
                :key="image.id || image.url"
                class="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 relative"
              >
                <img
                  :src="image.url"
                  :alt="image.alt"
                  class="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  loading="lazy"
                />
                <figcaption v-if="image.description" class="px-4 py-3 text-xs text-gray-400">{{ image.description }}</figcaption>
                <button v-if="isEditing" @click="deleteMedia('image', image.url)" class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </figure>
            </div>

            <div v-if="isEditing" class="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 class="text-lg font-semibold text-slate-100 mb-4">Adicionar mídia</h3>
              <input
                type="file"
                accept="image/*"
                multiple
                @change="handleFileSelect"
                class="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
              />
              <div v-if="newMediaFiles.length" class="mt-4 grid gap-4 sm:grid-cols-2">
                <div v-for="(file, index) in newMediaFiles" :key="index" class="relative">
                  <img v-if="file.type.startsWith('image')" :src="file.preview" class="h-32 w-full object-cover rounded" />
                  <video v-else :src="file.preview" class="h-32 w-full object-cover rounded" controls></video>
                  <button @click="removeNewMedia(index)" class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <article class="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-base leading-relaxed text-gray-200">
              <div v-if="isEditing">
                <textarea
                  v-model="editForm.content"
                  class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows="6"
                  placeholder="Conteúdo do post"
                ></textarea>
              </div>
              <div v-else>
                <p v-if="!post.content" class="text-sm text-gray-500">
                  O criador ainda não adicionou uma descrição detalhada para este post.
                </p>
                <p v-else class="whitespace-pre-line">{{ post.content }}</p>
              </div>
            </article>
          </div>

          <aside class="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
            <div>
              <h2 class="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Resumo</h2>
              <div v-if="isEditing" class="mt-3">
                <textarea
                  v-model="editForm.summary"
                  class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows="3"
                  placeholder="Adicione um resumo rápido do post..."
                ></textarea>
              </div>
              <p v-else class="mt-3 text-base text-gray-200">
                {{ post.summary || 'Este espaço receberá um resumo rápido do post quando o criador adicionar mais detalhes.' }}
              </p>
            </div>
            <div class="h-px w-full bg-white/10"></div>
            <div class="space-y-3">
              <p v-if="post.video_url" class="flex items-center gap-2 text-xs text-cyan-200">
                <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-semibold">Vídeo</span>
                O criador anexou um vídeo exclusivo para este post.
              </p>
              <p v-if="additionalImages.length" class="flex items-center gap-2 text-xs text-purple-200">
                <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-semibold">Galeria</span>
                {{ additionalImages.length }} imagens em alta qualidade.
              </p>
              <p v-if="!post.video_url && !additionalImages.length" class="text-xs text-gray-500">
                Em breve você verá vídeos, galerias e anexos extras por aqui.
              </p>
            </div>
          </aside>
        </section>

        <section class="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 class="text-lg font-semibold text-slate-100">Interações</h2>
          <div class="space-y-4" data-stop-navigation>
            <ReactionBar :entity-id="post.id" entity-type="post" />
            <CommentSection :post-id="post.id" :post-owner-id="post.user_id" />
          </div>
        </section>
      </article>
    </main>

    <transition name="fade">
      <div v-if="showPostModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/70" @click="closePostModal"></div>
        <div class="relative z-10 w-full max-w-xl px-4">
          <button
            type="button"
            class="absolute right-6 top-6 text-gray-400 transition hover:text-white"
            @click="closePostModal"
            aria-label="Fechar"
          >
            ✕
          </button>
          <PostForm @success="handlePostSuccess" @cancel="closePostModal" />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavigationBar from '@/components/NavigationBar.vue'
import ReactionBar from '@/components/ReactionBar.vue'
import CommentSection from '@/components/CommentSection.vue'
import PostForm from '@/components/PostForm.vue'
import { usePostsStore } from '@/stores/posts'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()
const authStore = useAuthStore()

const showPostModal = ref(false)
const isLoading = ref(true)
const errorMessage = ref('')
const post = ref(null)
const editForm = reactive({ title: '', content: '', summary: '' })
const savingEdit = ref(false)
const isEditing = ref(false)
const newMediaFiles = ref([])

const postId = computed(() => route.params.id)

const loadPost = async (id) => {
  if (!id) {
    errorMessage.value = 'Post não encontrado.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  const { success, data, error } = await postsStore.fetchPostById(id)
  if (!success) {
    errorMessage.value = error || 'Não foi possível carregar o post.'
    post.value = null
  } else {
    post.value = data
  }

  isLoading.value = false
}

watch(
  () => postId.value,
  async (id) => {
    await loadPost(id)
    // Check if edit mode
    if (route.query.edit === 'true') {
      openEditModal()
      // Clear query to avoid re-triggering
      router.replace({ name: 'PostDetails', params: { id }, query: {} })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },
  { immediate: true }
)

watch(
  () => post.value,
  (current) => {
    if (current?.title) {
      document.title = `${current.title} • CreatorsHub`
    } else {
      document.title = 'CreatorsHub • Detalhes do post'
    }
  },
  { immediate: true }
)

const displayName = computed(() => post.value?.users?.username || post.value?.users?.full_name || post.value?.users?.email || 'Usuário')
const initials = computed(() => displayName.value.charAt(0).toUpperCase())

const detailedDate = computed(() => {
  if (!post.value?.created_at) return 'Data não informada'
  const date = new Date(post.value.created_at)
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const voteSummary = computed(() => post.value?.vote_summary || { upvotes: 0, downvotes: 0, score: 0 })
const upvotes = computed(() => voteSummary.value.upvotes ?? 0)
const downvotes = computed(() => voteSummary.value.downvotes ?? 0)
const commentCount = computed(() => post.value?.comment_count ?? 0)

const mediaAssets = computed(() => Array.isArray(post.value?.media) ? post.value.media : [])

const heroVideo = computed(() => {
  if (post.value?.video_url) return post.value.video_url
  const mediaVideo = mediaAssets.value.find((item) => item?.type === 'video' && item?.url)
  return mediaVideo?.url || null
})

const heroImage = computed(() => {
  if (heroVideo.value) return null
  if (post.value?.cover_image_url) {
    return {
      url: post.value.cover_image_url,
      alt: post.value.title || 'Imagem do post'
    }
  }
  const mediaImage = mediaAssets.value.find((item) => item?.type === 'image' && item?.url)
  if (mediaImage) {
    return {
      url: mediaImage.url,
      alt: mediaImage.description || post.value?.title || 'Imagem do post'
    }
  }
  if (post.value?.image_url) {
    return {
      url: post.value.image_url,
      alt: post.value.title || 'Imagem do post'
    }
  }
  return null
})

const additionalImages = computed(() => {
  const images = mediaAssets.value.filter((item) => item?.type === 'image' && item?.url)
  const fallbackImages = []

  if (!images.length && post.value?.image_url) {
    fallbackImages.push({ url: post.value.image_url, alt: post.value?.title || 'Imagem do post' })
  }

  return images.filter((item) => heroImage.value ? item.url !== heroImage.value.url : true).map((item) => ({
    ...item,
    alt: item.description || post.value?.title || 'Imagem do post'
  })).concat(fallbackImages)
})

const isOwner = computed(() => authStore.user?.id === post.value?.user_id)

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push({ name: 'Feed' })
}

const handleLogout = async () => {
  showPostModal.value = false
  await authStore.signOut()
  router.push('/')
}

const openPostModal = () => {
  if (!authStore.isCreator) return
  showPostModal.value = true
}

const closePostModal = () => {
  showPostModal.value = false
}

const handlePostSuccess = () => {
  closePostModal()
}

const openEditModal = () => {
  isEditing.value = true
  editForm.title = post.value.title
  editForm.content = post.value.content
  editForm.summary = post.value.summary || ''
  newMediaFiles.value = []
}

const closeEditModal = () => {
  isEditing.value = false
  editForm.title = ''
  editForm.content = ''
  editForm.summary = ''
  newMediaFiles.value = []
}

const saveEdit = async () => {
  savingEdit.value = true
  const { success, error, data } = await postsStore.updatePost(post.value.id, {
    title: editForm.title,
    content: editForm.content,
    summary: editForm.summary
  })
  if (!success) {
    savingEdit.value = false
    alert('Erro ao salvar: ' + error)
    return
  }

  // Update local post state
  post.value = data

  // Handle new media uploads
  const newMediaList = []
  for (const fileObj of newMediaFiles.value) {
    try {
      const { success: uploadSuccess, url } = await postsStore.uploadImage(fileObj.file)
      if (uploadSuccess) {
        const mediaData = {
          post_id: post.value.id,
          type: 'image',
          url: url,
          sort_order: 0
        }
        const { data, error } = await supabase.from('post_media').insert(mediaData).select().single()
        if (!error && data) {
          newMediaList.push(data)
        }
      }
    } catch (error) {
      console.error('Error uploading media:', error)
    }
  }

  // Update local state
  post.value.media = [...(post.value.media || []), ...newMediaList]

  newMediaFiles.value = []
  savingEdit.value = false
  closeEditModal()
  // No need to loadPost, since we updated locally
}

const confirmDelete = async () => {
  if (confirm('Tem certeza que deseja excluir este post?')) {
    const { success, error } = await postsStore.deletePost(post.value.id)
    if (success) {
      router.push({ name: 'Feed' })
    } else {
      alert('Erro ao excluir: ' + error)
    }
  }
}

const deleteMedia = async (type, url) => {
  if (!confirm('Tem certeza que deseja excluir esta mídia? Esta ação não pode ser desfeita.')) return

  try {
    if (type === 'video') {
      const { error } = await supabase.from('posts').update({ video_url: null }).eq('id', post.value.id)
      if (error) throw error
      post.value.video_url = null
    } else if (type === 'image') {
      if (post.value.image_url === url) {
        const { error } = await supabase.from('posts').update({ image_url: null }).eq('id', post.value.id)
        if (error) throw error
        post.value.image_url = null
      } else if (post.value.cover_image_url === url) {
        const { error } = await supabase.from('posts').update({ cover_image_url: null }).eq('id', post.value.id)
        if (error) throw error
        post.value.cover_image_url = null
      } else {
        // Delete from post_media
        const { error } = await supabase.from('post_media').delete().eq('post_id', post.value.id).eq('url', url)
        if (error) throw error
        post.value.media = (post.value.media || []).filter(m => m.url !== url)
      }
    }
  } catch (error) {
    console.error('Error deleting media:', error)
    alert('Erro ao excluir mídia: ' + error.message)
  }
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return // Only images for now
    const reader = new FileReader()
    reader.onload = (e) => {
      newMediaFiles.value.push({
        file,
        preview: e.target.result,
        type: file.type
      })
    }
    reader.readAsDataURL(file)
  })
}

const removeNewMedia = (index) => {
  newMediaFiles.value.splice(index, 1)
}
</script>
