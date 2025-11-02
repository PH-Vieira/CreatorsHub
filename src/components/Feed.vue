<template>
  <div class="min-h-screen bg-black text-white">
    <header class="bg-gray-800 p-4 border-b border-gray-700">
      <h1 class="text-2xl font-bold text-center text-cyan-400">CreatorsHub Feed</h1>
    </header>
    <main class="max-w-2xl mx-auto p-4">
      <div v-for="post in posts" :key="post.id" class="bg-gray-800 p-4 mb-4 rounded-lg border border-gray-700">
        <div class="flex items-center mb-2">
          <div class="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
            {{ post.avatar }}
          </div>
          <div>
            <p class="font-semibold">{{ post.username }}</p>
            <p class="text-gray-400 text-sm">{{ post.timestamp }}</p>
          </div>
        </div>
        <p class="text-gray-300">{{ post.content }}</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const posts = ref([
  {
    id: 1,
    username: 'FotografoPro',
    avatar: 'FP',
    timestamp: '2h ago',
    content: 'Nova técnica de iluminação para retratos. Placeholder content for the feed.'
  },
  {
    id: 2,
    username: 'DesignerGrafico',
    avatar: 'DG',
    timestamp: '4h ago',
    content: 'Dicas para design minimalista. Placeholder text here.'
  },
  {
    id: 3,
    username: 'VideoMaker',
    avatar: 'VM',
    timestamp: '6h ago',
    content: 'Edição de vídeo com efeitos especiais. More placeholder content.'
  },
  {
    id: 4,
    username: 'EditorFoto',
    avatar: 'EF',
    timestamp: '8h ago',
    content: 'Correção de cor em fotos antigas. Placeholder for community updates.'
  }
])
</script>