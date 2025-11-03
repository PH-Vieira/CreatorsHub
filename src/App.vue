<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
body {
  margin: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.18), transparent 45%),
    radial-gradient(circle at 80% 10%, rgba(59, 130, 246, 0.12), transparent 45%),
    radial-gradient(circle at 50% 100%, rgba(14, 165, 233, 0.1), transparent 55%),
    #020817;
  color: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
