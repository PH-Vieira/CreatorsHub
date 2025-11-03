import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isCreator = computed(() => profile.value?.role === 'creator' || profile.value?.role === 'admin')

  async function initializeAuth() {
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
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        user.value = session.user
        await fetchProfile()
      } else {
        user.value = null
        profile.value = null
      }
    })
  }

  async function fetchProfile() {
    if (!user.value) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.value.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching profile:', error)
      } else {
        profile.value = data
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

  async function signOut() {
    try {
      await supabase.auth.signOut()
      user.value = null
      profile.value = null
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  async function updateProfile(updates) {
    if (!user.value) return { success: false, error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.value.id)
        .select()
        .single()

      if (error) throw error

      profile.value = data
      return { success: true }
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
    updateProfile
  }
})
