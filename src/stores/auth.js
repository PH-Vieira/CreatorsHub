import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const initialized = ref(false)

  let initPromise = null
  let authListenerAttached = false

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role?.includes('admin'))
  const isCreator = computed(() => profile.value?.role?.includes('creator') || profile.value?.role?.includes('admin'))

  async function initializeAuth({ force = false } = {}) {
    if (!force && initialized.value) return
    if (!force && initPromise) return initPromise

    if (force && initPromise) {
      await initPromise
    }

    if (force) {
      initialized.value = false
    }

    initPromise = (async () => {
      loading.value = true
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          user.value = session.user
          await fetchProfile()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        loading.value = false
        initialized.value = true
      }

      if (!authListenerAttached) {
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            user.value = session.user
            await fetchProfile()
          } else {
            user.value = null
            profile.value = null
            initialized.value = false
          }
        })
        authListenerAttached = true
      }
    })()

    await initPromise
    initPromise = null
  }

  async function fetchProfile() {
    if (!user.value) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.value.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return
      }

      if (data) {
        profile.value = data
        return
      }

      const metadata = user.value.user_metadata || {}
      profile.value = {
        id: user.value.id,
        email: user.value.email,
        full_name: metadata.full_name || null,
        username: metadata.username || null,
        role: []
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  async function signIn(email, password) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      user.value = data.user
      await fetchProfile()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  async function signInWithProvider(provider) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      if (data?.url) {
        window.location.href = data.url
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function signUp({ email, password, fullName, username }) {
    loading.value = true
    try {
      const sanitizedFullName = fullName?.trim() || null
      const sanitizedUsername = username?.trim() || null

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: sanitizedFullName || undefined,
            username: sanitizedUsername || undefined
          }
        }
      })

      if (error) throw error

      const requiresEmailConfirmation = !data.session

      if (data.user && data.session) {
        user.value = data.user
        const updatePayload = {}

        if (sanitizedFullName) updatePayload.full_name = sanitizedFullName
        if (sanitizedUsername) updatePayload.username = sanitizedUsername

        if (Object.keys(updatePayload).length > 0) {
          const { error: profileError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', data.user.id)
            .select()
            .maybeSingle()

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError
          }
        }

        await fetchProfile()
      }

      return {
        success: true,
        requiresEmailConfirmation
      }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
      user.value = null
      profile.value = null
      initialized.value = false
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  async function updateProfile(updates) {
    if (!user.value) return { success: false, error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .maybeSingle()

      if (error) throw error

      if (!data) {
        await fetchProfile()
        return { success: true }
      }

      profile.value = data
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function uploadAvatar(file) {
    if (!user.value) return { success: false, error: 'Not authenticated' }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'A imagem deve ter no máximo 50MB' }
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Apenas arquivos de imagem são permitidos' }
    }

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `${user.value.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath)

      if (!publicData?.publicUrl) {
        throw new Error('Não foi possível obter o link da imagem')
      }

      return { success: true, url: publicData.publicUrl }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    isCreator,
    initializeAuth,
    fetchProfile,
    signIn,
    signOut,
    updateProfile,
    uploadAvatar,
    signInWithProvider,
    signUp
  }
})
