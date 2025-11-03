<template>
  <div class="min-h-screen bg-black flex items-center justify-center">
    <div class="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
      <h2 class="text-white text-2xl font-bold mb-6 text-center">Criar Usuário (Temporário)</h2>
      <form @submit.prevent="handleCreateUser" class="space-y-4">
        <div>
          <label for="email" class="block text-gray-300 mb-2">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label for="password" class="block text-gray-300 mb-2">Senha Temporária</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label for="role" class="block text-gray-300 mb-2">Role</label>
          <select
            id="role"
            v-model="role"
            required
            class="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="creator">Creator</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded font-semibold transition"
        >
          {{ loading ? 'Criando...' : 'Criar Usuário' }}
        </button>
      </form>
      <p v-if="error" class="text-red-500 mt-4 text-center">{{ error }}</p>
      <p v-if="success" class="text-green-500 mt-4 text-center">{{ success }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const email = ref('')
const password = ref('')
const role = ref('viewer')
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleCreateUser = async () => {
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    // Nota: Isso é temporário e usa signUp, mas para criação real de usuários por admin,
    // precisamos de uma Edge Function ou API admin. Por enquanto, isso cria o usuário
    // e assume que o role será setado manualmente no Supabase.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    })

    if (signUpError) {
      error.value = signUpError.message
    } else {
      success.value = 'Usuário criado! Role deve ser setado manualmente no Supabase.'
      // Aqui, em produção, chamar Edge Function para setar role
    }
  } catch (err) {
    error.value = 'Erro ao criar usuário.'
  }

  loading.value = false
}
</script>