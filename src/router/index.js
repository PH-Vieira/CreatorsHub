import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/components/Login.vue'
import Feed from '@/components/Feed.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Login',
      component: Login,
    },
    {
      path: '/feed',
      name: 'Feed',
      component: Feed,
    },
  ],
})

export default router
