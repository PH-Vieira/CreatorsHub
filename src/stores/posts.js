import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const usePostsStore = defineStore('posts', () => {
  const posts = ref([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(true)
  const page = ref(0)
  const pageSize = 3

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
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const fetched = data || []

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

      posts.value.unshift(data) // Add to beginning of array
      hasMore.value = true
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

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    fetchPosts,
    fetchMore,
    createPost,
    deletePost,
    uploadImage
  }
})