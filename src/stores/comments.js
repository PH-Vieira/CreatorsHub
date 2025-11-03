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
  const authStore = useAuthStore()

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
    commentsByPost.value = { ...commentsByPost.value, [postId]: sortCommentArray(comments) }
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

  const sortCommentArray = (list) => {
    return [...list].sort((a, b) => {
      const pinnedDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned)
      if (pinnedDiff !== 0) return pinnedDiff

      const pinnedAtA = a.pinned_at ? new Date(a.pinned_at).getTime() : 0
      const pinnedAtB = b.pinned_at ? new Date(b.pinned_at).getTime() : 0
      if (pinnedAtB !== pinnedAtA) return pinnedAtB - pinnedAtA

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }

  const decorateComments = async (postId, comments) => {
    if (!comments.length) return comments

    const commentIds = comments.map((comment) => comment.id)

    let votesData = []
    const votesResponse = await supabase
      .from('comment_votes')
      .select('comment_id, user_id, value')
      .in('comment_id', commentIds)

    if (!votesResponse.error) {
      votesData = votesResponse.data || []
    }

    const authStore = useAuthStore()

    const summaryMap = {}
    const userVoteMap = {}

    votesData.forEach((vote) => {
      if (!summaryMap[vote.comment_id]) {
        summaryMap[vote.comment_id] = { upvotes: 0, downvotes: 0, score: 0 }
      }

      if (vote.value === 1) summaryMap[vote.comment_id].upvotes += 1
      if (vote.value === -1) summaryMap[vote.comment_id].downvotes += 1
      summaryMap[vote.comment_id].score = summaryMap[vote.comment_id].upvotes - summaryMap[vote.comment_id].downvotes

      if (vote.user_id === authStore.user?.id) {
        userVoteMap[vote.comment_id] = vote.value
      }
    })

    return comments.map((comment) => ({
      ...comment,
      vote_summary: summaryMap[comment.id] || { upvotes: 0, downvotes: 0, score: 0 },
      user_vote: userVoteMap[comment.id] || 0
    }))
  }

  const updateCommentInPost = (postId, commentId, updater) => {
    const existing = getCommentsForPost(postId)
    const updated = existing.map((comment) => {
      if (comment.id === commentId) {
        return updater({ ...comment })
      }
      return comment
    })
    setComments(postId, updated)
  }

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

      const decorated = await decorateComments(postId, data || [])
      setComments(postId, decorated)
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

      const [decorated] = await decorateComments(postId, [data])
      const existing = getCommentsForPost(postId)
      setComments(postId, [...existing, decorated])
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

  async function toggleCommentVote(postId, commentId, value) {
    if (!postId || !commentId) {
      return { success: false, error: 'Comentário inválido' }
    }

    if (!authStore.user) {
      return { success: false, error: 'É necessário estar autenticado' }
    }

    const existing = getCommentsForPost(postId)
    const target = existing.find((comment) => comment.id === commentId)

    if (!target) {
      return { success: false, error: 'Comentário não encontrado' }
    }

    const currentVote = target.user_vote || 0
    let newVote = value

    try {
      if (currentVote === value) {
        const { error } = await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', authStore.user.id)

        if (error) throw error
        newVote = 0
      } else {
        const { error } = await supabase
          .from('comment_votes')
          .upsert({
            comment_id: commentId,
            user_id: authStore.user.id,
            value
          })

        if (error) throw error
      }

      updateCommentInPost(postId, commentId, (comment) => {
        const summary = { ...(comment.vote_summary || { upvotes: 0, downvotes: 0, score: 0 }) }

        if (currentVote === 1) summary.upvotes = Math.max(0, summary.upvotes - 1)
        if (currentVote === -1) summary.downvotes = Math.max(0, summary.downvotes - 1)

        if (newVote === 1) summary.upvotes += 1
        if (newVote === -1) summary.downvotes += 1

        summary.score = summary.upvotes - summary.downvotes

        comment.vote_summary = summary
        comment.user_vote = newVote
        return comment
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function toggleCommentPin(postId, commentId, shouldPin) {
    if (!postId || !commentId) {
      return { success: false, error: 'Comentário inválido' }
    }

    const authStore = useAuthStore()
    if (!authStore.user) {
      return { success: false, error: 'É necessário estar autenticado' }
    }

    try {
      const updates = shouldPin
        ? {
            is_pinned: true,
            pinned_by: authStore.user.id,
            pinned_at: new Date().toISOString()
          }
        : {
            is_pinned: false,
            pinned_by: null,
            pinned_at: null
          }

      const { error } = await supabase
        .from('comments')
        .update(updates)
        .eq('id', commentId)

      if (error) throw error

      updateCommentInPost(postId, commentId, (comment) => ({
        ...comment,
        ...updates
      }))

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
    toggleCommentVote,
    toggleCommentPin,
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
