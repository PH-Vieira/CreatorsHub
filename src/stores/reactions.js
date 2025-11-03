import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🤔', '🔥', '💯']

const entityKey = (entityId, entityType) => `${entityType}:${entityId}`

export const useReactionsStore = defineStore('reactions', () => {
  const reactionsByEntity = ref({})
  const loadingByEntity = ref({})

  const setLoading = (key, value) => {
    loadingByEntity.value = { ...loadingByEntity.value, [key]: value }
  }

  const setReactions = (key, payload) => {
    reactionsByEntity.value = { ...reactionsByEntity.value, [key]: payload }
  }

  const getReactionData = (entityId, entityType = 'post') => {
    const data = reactionsByEntity.value[entityKey(entityId, entityType)]
    if (!data) {
      return {
        counts: {},
        userReactions: [],
        total: 0
      }
    }
    return data
  }

  const isLoading = (entityId, entityType = 'post') => !!loadingByEntity.value[entityKey(entityId, entityType)]

  async function fetchReactions(entityId, entityType = 'post') {
    const key = entityKey(entityId, entityType)
    setLoading(key, true)

    try {
      const { data, error } = await supabase
        .from('reactions')
        .select('id, entity_id, entity_type, user_id, emoji, created_at')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)

      if (error) throw error

      const authStore = useAuthStore()
      const counts = {}
      const userReactionsSet = new Set()

      data?.forEach((reaction) => {
        counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1
        if (reaction.user_id === authStore.user?.id) {
          userReactionsSet.add(reaction.emoji)
        }
      })

      setReactions(key, {
        counts,
        userReactions: Array.from(userReactionsSet),
        total: data?.length || 0
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(key, false)
    }
  }

  async function toggleReaction(entityId, emoji, entityType = 'post') {
    const key = entityKey(entityId, entityType)
    const authStore = useAuthStore()

    if (!authStore.user) {
      return { success: false, error: 'É necessário estar autenticado' }
    }

    const currentData = getReactionData(entityId, entityType)
    const userHasReaction = currentData.userReactions.includes(emoji)

    try {
      if (userHasReaction) {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('entity_id', entityId)
          .eq('entity_type', entityType)
          .eq('user_id', authStore.user.id)
          .eq('emoji', emoji)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('reactions')
          .insert([
            {
              entity_id: entityId,
              entity_type: entityType,
              user_id: authStore.user.id,
              emoji
            }
          ])

        if (error) throw error
      }

      await fetchReactions(entityId, entityType)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  return {
    availableEmojis: EMOJIS,
    fetchReactions,
    toggleReaction,
    getReactionData,
    isLoading
  }
})
