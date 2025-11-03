import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export const usePostsStore = defineStore('posts', () => {
  const posts = ref([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(true)
  const page = ref(0)
  const pageSize = 3
  const favoritePosts = ref([])
  const loadingFavorites = ref(false)

  const authStore = useAuthStore()

  const sortPosts = () => {
    posts.value = [...posts.value].sort((a, b) => {
      const pinnedDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned)
      if (pinnedDiff !== 0) return pinnedDiff
      const pinnedAtA = a.pinned_at ? new Date(a.pinned_at).getTime() : 0
      const pinnedAtB = b.pinned_at ? new Date(b.pinned_at).getTime() : 0
      if (pinnedAtB !== pinnedAtA) return pinnedAtB - pinnedAtA
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  const decoratePosts = async (postList) => {
    if (!postList.length) return postList

    const postIds = postList.map((post) => post.id)

    let votesData = []
    let favoritesData = []

    const votesResponse = await supabase
      .from('post_votes')
      .select('post_id, user_id, value')
      .in('post_id', postIds)

    if (!votesResponse.error) {
      votesData = votesResponse.data || []
    }

    if (authStore.user) {
      const favoritesResponse = await supabase
        .from('favorite_posts')
        .select('post_id')
        .eq('user_id', authStore.user.id)
        .in('post_id', postIds)

      if (!favoritesResponse.error) {
        favoritesData = favoritesResponse.data || []
      }
    }

    const voteSummaryMap = {}
    const userVoteMap = {}

    votesData.forEach((vote) => {
      if (!voteSummaryMap[vote.post_id]) {
        voteSummaryMap[vote.post_id] = { upvotes: 0, downvotes: 0, score: 0 }
      }
      if (vote.value === 1) {
        voteSummaryMap[vote.post_id].upvotes += 1
      } else if (vote.value === -1) {
        voteSummaryMap[vote.post_id].downvotes += 1
      }
      voteSummaryMap[vote.post_id].score = voteSummaryMap[vote.post_id].upvotes - voteSummaryMap[vote.post_id].downvotes

      if (vote.user_id === authStore.user?.id) {
        userVoteMap[vote.post_id] = vote.value
      }
    })

    const favoritesSet = new Set(favoritesData.map((fav) => fav.post_id))

    return postList.map((post) => ({
      ...post,
      vote_summary: voteSummaryMap[post.id] || { upvotes: 0, downvotes: 0, score: 0 },
      user_vote: userVoteMap[post.id] || 0,
      is_favorited: favoritesSet.has(post.id)
    }))
  }

  const updatePostInState = (postId, updater) => {
    posts.value = posts.value.map((post) => {
      if (post.id === postId) {
        return updater({ ...post })
      }
      return post
    })
    sortPosts()
  }

  async function fetchPosts({ reset = true } = {}) {
    if (reset) {
      loading.value = true
      loadingMore.value = false
      posts.value = []
      hasMore.value = true
      page.value = 0
    } else {
      if (loading.value || loadingMore.value || !hasMore.value) {
        return { success: true, data: [] }
      }
      loadingMore.value = true
    }

    const from = reset ? 0 : page.value * pageSize
    const to = from + pageSize - 1

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id (
            username,
            full_name,
            avatar_url,
            email
          )
        `)
        .order('is_pinned', { ascending: false })
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const fetchedRaw = data || []
      const fetched = await decoratePosts(fetchedRaw)

      if (reset) {
        posts.value = fetched
      } else {
        const existingIds = new Set(posts.value.map((post) => post.id))
        const newItems = fetched.filter((post) => !existingIds.has(post.id))
        posts.value = [...posts.value, ...newItems]
      }

      if (fetched.length < pageSize) {
        hasMore.value = false
      }

      if (fetched.length > 0) {
        page.value += 1
      }

      sortPosts()

      return { success: true, data: fetched }
    } catch (error) {
      console.error('Error fetching posts:', error)
      return { success: false, error: error.message }
    } finally {
      if (reset) {
        loading.value = false
      } else {
        loadingMore.value = false
      }
    }
  }

  async function createPost(postData) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select(`
          *,
          users:user_id (
            username,
            full_name,
            avatar_url,
            email
          )
        `)
        .single()

      if (error) throw error

      const [decorated] = await decoratePosts([data])
      posts.value.unshift(decorated)
      hasMore.value = true
      sortPosts()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function deletePost(postId) {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      posts.value = posts.value.filter((post) => post.id !== postId)
      favoritePosts.value = favoritePosts.value.filter((fav) => fav.id !== postId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function uploadImage(file) {
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 50MB' }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Only image files are allowed' }
    }

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `posts/${fileName}`

      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      return { success: true, url: publicUrl, size: file.size }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const fetchMore = () => fetchPosts({ reset: false })

  async function togglePostVote(postId, value) {
    if (!authStore.user) {
      return { success: false, error: 'É necessário estar autenticado' }
    }

    const post = posts.value.find((item) => item.id === postId)
    if (!post) {
      return { success: false, error: 'Post não encontrado' }
    }

    const currentVote = post.user_vote || 0
    let newVote = value

    try {
      if (currentVote === value) {
        const { error } = await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', authStore.user.id)

        if (error) throw error
        newVote = 0
      } else {
        const { error } = await supabase
          .from('post_votes')
          .upsert({
            post_id: postId,
            user_id: authStore.user.id,
            value
          })

        if (error) throw error
      }

      updatePostInState(postId, (target) => {
        const summary = { ...(target.vote_summary || { upvotes: 0, downvotes: 0, score: 0 }) }

        if (currentVote === 1) summary.upvotes = Math.max(0, summary.upvotes - 1)
        if (currentVote === -1) summary.downvotes = Math.max(0, summary.downvotes - 1)

        if (newVote === 1) summary.upvotes += 1
        if (newVote === -1) summary.downvotes += 1

        summary.score = summary.upvotes - summary.downvotes

        target.vote_summary = summary
        target.user_vote = newVote
        return target
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function toggleFavorite(postId) {
    if (!authStore.user) {
      return { success: false, error: 'É necessário estar autenticado' }
    }

    const post = posts.value.find((item) => item.id === postId)
    if (!post) {
      return { success: false, error: 'Post não encontrado' }
    }

    const isFavorited = post.is_favorited

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorite_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', authStore.user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('favorite_posts')
          .insert({
            post_id: postId,
            user_id: authStore.user.id
          })

        if (error) throw error
      }

      updatePostInState(postId, (target) => {
        target.is_favorited = !isFavorited
        return target
      })

      favoritePosts.value = favoritePosts.value.filter((fav) => fav.id !== postId)

      if (!isFavorited) {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            users:user_id (
              username,
              full_name,
              avatar_url,
              email
            )
          `)
          .eq('id', postId)
          .single()

        if (!error && data) {
          const [decorated] = await decoratePosts([data])
          favoritePosts.value = [decorated, ...favoritePosts.value]
        }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function togglePostPin(postId, shouldPin) {
    if (!authStore.isAdmin) {
      return { success: false, error: 'Apenas administradores podem fixar posts' }
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
        .from('posts')
        .update(updates)
        .eq('id', postId)

      if (error) throw error

      updatePostInState(postId, (target) => ({
        ...target,
        ...updates
      }))

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async function fetchFavoritePosts() {
    if (!authStore.user) {
      favoritePosts.value = []
      return { success: false, error: 'É necessário estar autenticado' }
    }

    loadingFavorites.value = true

    try {
      const { data, error } = await supabase
        .from('favorite_posts')
        .select(`
          created_at,
          posts:post_id (
            *,
            users:user_id (
              username,
              full_name,
              avatar_url,
              email
            )
          )
        `)
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const postsRaw = (data || []).map((entry) => ({
        ...entry.posts,
        favorited_at: entry.created_at
      }))

      const decorated = await decoratePosts(postsRaw)
      favoritePosts.value = decorated
      return { success: true, data: decorated }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loadingFavorites.value = false
    }
  }

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    favoritePosts,
    loadingFavorites,
    fetchPosts,
    fetchMore,
    createPost,
    deletePost,
    uploadImage,
    togglePostVote,
    toggleFavorite,
    togglePostPin,
    fetchFavoritePosts
  }
})