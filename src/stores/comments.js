import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export const useCommentsStore = defineStore('comments', () => {
  const commentsByPost = ref({})
  const countsByPost = ref({})
  const loadingByPost = ref({})
  const errorsByPost = ref({})
  const loadedPosts = ref({})

  const setLoading = (postId, value) => {
    loadingByPost.value = { ...loadingByPost.value, [postId]: value }
  }

  const setError = (postId, message) => {
    errorsByPost.value = { ...errorsByPost.value, [postId]: message }
  }

  const setLoaded = (postId, value) => {
    loadedPosts.value = { ...loadedPosts.value, [postId]: value }
  }

  const setComments = (postId, comments) => {
    commentsByPost.value = { ...commentsByPost.value, [postId]: comments }
  }

  const setCount = (postId, count) => {
    countsByPost.value = { ...countsByPost.value, [postId]: count }
  }

  const getCommentsForPost = (postId) => commentsByPost.value[postId] || []
  const getCommentCount = (postId) => {
    const stored = countsByPost.value[postId]
    if (typeof stored === 'number') {
      return stored
    }
    return getCommentsForPost(postId).length
  }
  const isLoading = (postId) => !!loadingByPost.value[postId]
  const getError = (postId) => errorsByPost.value[postId] || null
  const hasLoaded = (postId) => !!loadedPosts.value[postId]
  const hasCount = (postId) => typeof countsByPost.value[postId] === 'number'

  async function fetchComments(postId) {
    if (!postId) return { success: false, error: 'Invalid post' }

    setLoading(postId, true)
    setError(postId, null)

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          post_id,
          user_id,
          content,
          parent_id,
          created_at,
          users:user_id (
            username,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setComments(postId, data || [])
      setCount(postId, data?.length || 0)
      setLoaded(postId, true)
      return { success: true, data: data || [] }
    } catch (error) {
      setError(postId, error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(postId, false)
    }
  }

  async function addComment(postId, content, parentId = null) {
    if (!postId || !content?.trim()) {
      return { success: false, error: 'Comentário vazio' }
    }

    const authStore = useAuthStore()
    if (!authStore.user) {
      return { success: false, error: 'É necessário estar autenticado' }
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            content: content.trim(),
            parent_id: parentId,
            user_id: authStore.user.id
          }
        ])
        .select(`
          id,
          post_id,
          user_id,
          content,
          parent_id,
          created_at,
          users:user_id (
            username,
            full_name,
            avatar_url,
            email
          )
        `)
        .single()

      if (error) throw error

      const existing = getCommentsForPost(postId)
      setComments(postId, [...existing, data])
      setCount(postId, getCommentCount(postId) + 1)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function deleteComment(commentId) {
    if (!commentId) return { success: false, error: 'Comentário inválido' }

    try {
      let targetPostId = null
      Object.entries(commentsByPost.value).forEach(([postId, comments]) => {
        if (comments.some((comment) => comment.id === commentId)) {
          targetPostId = postId
        }
      })

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      if (targetPostId) {
        await fetchComments(targetPostId)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function fetchCommentCount(postId) {
    if (!postId) return { success: false, error: 'Invalid post' }

    try {
      const { count, error } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)

      if (error) throw error

      setCount(postId, count || 0)
      return { success: true, data: count || 0 }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function ensureCommentCount(postId) {
    if (hasCount(postId)) {
      return { success: true, data: getCommentCount(postId) }
    }
    return fetchCommentCount(postId)
  }

  return {
    fetchComments,
    addComment,
    deleteComment,
    fetchCommentCount,
    ensureCommentCount,
    getCommentsForPost,
    getCommentCount,
    isLoading,
    getError,
    hasLoaded,
    hasCount
  }
})
