import { createRouter, createWebHistory } from 'vue-router'
import AuthLanding from '@/components/AuthLanding.vue'
import Feed from '@/components/Feed.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Login',
      component: AuthLanding,
      meta: { requiresAuth: false }
    },
    {
      path: '/feed',
      name: 'Feed',
      component: Feed,
      meta: { requiresAuth: true }
    },
    {
      path: '/favorites',
      name: 'Favorites',
      component: () => import('@/components/Favorites.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/create-user',
      name: 'UserCreation',
      component: () => import('@/components/UserCreation.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/profile',
      name: 'ProfileSettings',
      component: () => import('@/components/ProfileSettings.vue'),
      meta: { requiresAuth: true }
    }
  ],
})

// Navigation guard for authentication and role checks
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  await authStore.initializeAuth()

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresAdmin = to.meta.requiresAdmin === true

  if (requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login' })
  }

  if (requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'Feed' })
  }

  if (to.path === '/' && authStore.isAuthenticated) {
    return next({ name: 'Feed' })
  }

  return next()
})

export default router
