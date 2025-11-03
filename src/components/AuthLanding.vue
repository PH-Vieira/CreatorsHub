<template>
  <div class="relative min-h-screen overflow-hidden bg-black text-white">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"></div>
      <div class="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl"></div>
      <div class="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    </div>

    <div class="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col-reverse gap-16 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-24">
      <section class="max-w-2xl space-y-8 text-center lg:text-left">
        <div class="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
          CreatorsHub
        </div>
        <h1 class="text-4xl font-bold leading-tight text-slate-100 sm:text-5xl">
          Conecte, compartilhe e descubra ideias com a comunidade criativa.
        </h1>
        <p class="max-w-xl text-base text-gray-300 sm:text-lg">
          Crie posts, receba feedback em tempo real, acompanhe tendências e fortaleça sua presença como criador.
          Tudo em um único lugar, pensado para impulsionar sua jornada.
        </p>
        <div class="grid gap-6 sm:grid-cols-2">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
              <span class="text-xl">⚡</span>
            </div>
            <h3 class="text-lg font-semibold text-white">Colaboração instantânea</h3>
            <p class="mt-2 text-sm text-gray-300">
              Feedback em tempo real, votos e comentários que ajudam a evoluir suas ideias rapidamente.
            </p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
              <span class="text-xl">🎯</span>
            </div>
            <h3 class="text-lg font-semibold text-white">Comunidade qualificada</h3>
            <p class="mt-2 text-sm text-gray-300">
              Conecte-se com profissionais e criadores que compartilham dos mesmos objetivos que você.
            </p>
          </div>
        </div>
        <div class="flex flex-col items-center gap-3 text-sm text-gray-400 sm:flex-row sm:text-base">
          <span>Pronto para começar?</span>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 font-semibold text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
            @click="switchToSignup"
          >
            Criar uma conta agora
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </section>

      <section class="w-full max-w-md">
        <div class="rounded-3xl border border-white/10 bg-white/10 p-1 backdrop-blur-xl">
          <div class="rounded-[26px] bg-black/80 p-6 shadow-2xl shadow-cyan-500/10">
            <div class="mb-6 flex items-center justify-between rounded-full bg-white/5 p-1 text-sm">
              <button
                type="button"
                class="flex-1 rounded-full px-4 py-2 font-semibold transition"
                :class="mode === 'login' ? 'bg-cyan-500 text-black shadow shadow-cyan-500/40' : 'text-gray-400 hover:text-gray-200'"
                @click="switchMode('login')"
              >
                Entrar
              </button>
              <button
                type="button"
                class="flex-1 rounded-full px-4 py-2 font-semibold transition"
                :class="mode === 'signup' ? 'bg-purple-500 text-white shadow shadow-purple-500/40' : 'text-gray-400 hover:text-gray-200'"
                @click="switchMode('signup')"
              >
                Criar conta
              </button>
            </div>

            <div class="mb-6 space-y-3">
              <button
                type="button"
                class="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-white/20 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isOauthLoading"
                @click="handleProviderLogin('google')"
              >
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-gray-900">G</span>
                <span>{{ isOauthLoading ? 'Conectando...' : 'Continuar com Google' }}</span>
              </button>
              <div class="flex items-center gap-3 text-xs text-gray-500">
                <span class="h-px flex-1 bg-white/10"></span>
                <span>ou continue com email</span>
                <span class="h-px flex-1 bg-white/10"></span>
              </div>
            </div>

            <transition name="fade" mode="out-in">
              <form
                v-if="mode === 'login'"
                key="login"
                class="space-y-5"
                @submit.prevent="handleLogin"
              >
                <div>
                  <label for="login-email" class="mb-2 block text-sm font-medium text-gray-300">Email</label>
                  <input
                    id="login-email"
                    v-model.trim="loginForm.email"
                    type="email"
                    required
                    class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="voce@email.com"
                  />
                </div>
                <div>
                  <div class="mb-2 flex items-center justify-between text-sm">
                    <label for="login-password" class="font-medium text-gray-300">Senha</label>
                  </div>
                  <input
                    id="login-password"
                    v-model="loginForm.password"
                    type="password"
                    required
                    minlength="6"
                    class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  :disabled="isLoading"
                  class="w-full rounded-xl bg-cyan-500 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {{ isLoading ? 'Entrando...' : 'Entrar no CreatorsHub' }}
                </button>
                <p class="text-center text-sm text-gray-400">
                  Ainda não tem conta?
                  <button type="button" class="font-semibold text-cyan-300 hover:text-cyan-200" @click="switchMode('signup')">Cadastre-se</button>
                </p>
              </form>

              <form
                v-else
                key="signup"
                class="space-y-5"
                @submit.prevent="handleSignUp"
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="sm:col-span-2">
                    <label for="signup-fullname" class="mb-2 block text-sm font-medium text-gray-300">Nome completo</label>
                    <input
                      id="signup-fullname"
                      v-model.trim="signUpForm.fullName"
                      type="text"
                      required
                      minlength="3"
                      class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label for="signup-username" class="mb-2 block text-sm font-medium text-gray-300">Nome de usuário</label>
                    <input
                      id="signup-username"
                      v-model.trim="signUpForm.username"
                      type="text"
                      required
                      minlength="3"
                      class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      placeholder="ex: seunick"
                    />
                  </div>
                  <div>
                    <label for="signup-email" class="mb-2 block text-sm font-medium text-gray-300">Email</label>
                    <input
                      id="signup-email"
                      v-model.trim="signUpForm.email"
                      type="email"
                      required
                      class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      placeholder="voce@email.com"
                    />
                  </div>
                  <div>
                    <label for="signup-password" class="mb-2 block text-sm font-medium text-gray-300">Senha</label>
                    <input
                      id="signup-password"
                      v-model="signUpForm.password"
                      type="password"
                      required
                      minlength="6"
                      class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      placeholder="Mínimo de 6 caracteres"
                    />
                  </div>
                  <div>
                    <label for="signup-confirm-password" class="mb-2 block text-sm font-medium text-gray-300">Confirmar senha</label>
                    <input
                      id="signup-confirm-password"
                      v-model="signUpForm.confirmPassword"
                      type="password"
                      required
                      minlength="6"
                      class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      placeholder="Repita sua senha"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  :disabled="isLoading"
                  class="w-full rounded-xl bg-purple-500 py-2 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {{ isLoading ? 'Criando conta...' : 'Criar conta gratuita' }}
                </button>
                <p class="text-center text-xs text-gray-500">
                  Ao se cadastrar, você concorda com os termos de uso e política de privacidade do CreatorsHub.
                </p>
                <p class="text-center text-sm text-gray-400">
                  Já tem conta?
                  <button type="button" class="font-semibold text-cyan-300 hover:text-cyan-200" @click="switchMode('login')">Faça login</button>
                </p>
              </form>
            </transition>

            <transition name="fade">
              <p v-if="errorMessage" class="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {{ errorMessage }}
              </p>
            </transition>
            <transition name="fade">
              <p v-if="successMessage" class="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {{ successMessage }}
              </p>
            </transition>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const mode = ref('login')
const errorMessage = ref('')
const successMessage = ref('')
const isOauthLoading = ref(false)

const loginForm = reactive({
  email: '',
  password: ''
})

const signUpForm = reactive({
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const isLoading = computed(() => authStore.loading)

onMounted(() => {
  document.title = 'CreatorsHub • Comunidade de Criadores'
})

const switchMode = (value) => {
  mode.value = value
  errorMessage.value = ''
  successMessage.value = ''
}

const switchToSignup = () => {
  switchMode('signup')
}

const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  const { email, password } = loginForm
  if (!email || !password) {
    errorMessage.value = 'Informe email e senha para continuar.'
    return
  }

  const result = await authStore.signIn(email, password)
  if (!result.success) {
    errorMessage.value = result.error || 'Não foi possível fazer login.'
    return
  }

  router.push('/feed')
}

const handleSignUp = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  const { fullName, username, email, password, confirmPassword } = signUpForm

  if (!fullName || !username || !email || !password || !confirmPassword) {
    errorMessage.value = 'Preencha todos os campos para criar sua conta.'
    return
  }

  if (username.length < 3) {
    errorMessage.value = 'O nome de usuário deve ter pelo menos 3 caracteres.'
    return
  }

  if (password.length < 6) {
    errorMessage.value = 'A senha deve ter pelo menos 6 caracteres.'
    return
  }

  if (password !== confirmPassword) {
    errorMessage.value = 'As senhas precisam ser iguais.'
    return
  }

  const result = await authStore.signUp({
    email,
    password,
    fullName,
    username
  })

  if (!result.success) {
    errorMessage.value = result.error || 'Não foi possível criar sua conta.'
    return
  }

  if (result.requiresEmailConfirmation) {
    successMessage.value = 'Enviamos um email de confirmação. Verifique sua caixa de entrada para ativar sua conta.'
    switchMode('login')
    loginForm.email = email
    return
  }

  successMessage.value = 'Conta criada com sucesso! Personalize seu perfil e comece a postar.'
  router.push('/feed')
}

const handleProviderLogin = async (provider) => {
  if (isOauthLoading.value) return
  errorMessage.value = ''
  successMessage.value = ''
  isOauthLoading.value = true
  const result = await authStore.signInWithProvider(provider)
  if (!result.success) {
    errorMessage.value = result.error || 'Não foi possível iniciar a autenticação.'
    isOauthLoading.value = false
  }
}
</script>
