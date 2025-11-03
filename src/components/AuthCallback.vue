<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-black text-white">
    <div class="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-cyan-500/10">
      <div class="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-200">
        <svg class="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </svg>
      </div>
      <h1 class="text-lg font-semibold text-slate-100">Conectando sua conta...</h1>
      <p class="mt-2 text-sm text-gray-400">Aguarde alguns instantes enquanto finalizamos a autenticação.</p>
      <transition name="fade">
        <p v-if="errorMessage" class="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ errorMessage }}
        </p>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const errorMessage = ref('')

const redirectWithAuth = async (path) => {
  await authStore.initializeAuth({ force: true })
  router.replace(path)
}

onMounted(async () => {
  const currentUrl = new URL(window.location.href)
  const errorDescription = currentUrl.searchParams.get('error_description') || currentUrl.searchParams.get('error')

  if (errorDescription) {
    errorMessage.value = decodeURIComponent(errorDescription)
    setTimeout(() => router.replace('/'), 4000)
    return
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await redirectWithAuth('/feed')
      return
    }
  } catch (sessionError) {
    console.warn('Auth callback: unable to fetch session before exchange', sessionError)
  }

  const hasCode = currentUrl.searchParams.has('code')
  if (!hasCode) {
    await redirectWithAuth(authStore.isAuthenticated ? '/feed' : '/')
    return
  }

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

    if (error) {
      throw error
    }
  } catch (exchangeError) {
    console.error('Auth callback: exchange failed', exchangeError)
    errorMessage.value = exchangeError.message || 'Não foi possível concluir a autenticação. Verifique as URLs de redirecionamento no Supabase e tente novamente.'
    setTimeout(() => router.replace('/'), 5000)
    return
  }

  await redirectWithAuth('/feed')
})
</script>
