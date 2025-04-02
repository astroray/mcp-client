<template>
  <div class="app-container">
    <div class="sidebar">
      <ServerList />
    </div>
    <div class="main-content">
      <ChatInterface :is-connected="isConnected" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ServerList from './components/ServerList.vue'
import ChatInterface from './components/ChatInterface.vue'
import './styles/theme.css'

const isConnected = ref(false)

let cleanup: (() => void) | null = null

onMounted(() => {
  cleanup = window.electronAPI.onServerStatus((status) => {
    if (status.tools.length > 0) {
      isConnected.value = true
    }
  })
})

onUnmounted(() => {
  cleanup?.()
})
</script>

<style>
.app-container {
  height: 100vh;
  display: flex;
  background-color: var(--background-primary);
}

.sidebar {
  width: 300px;
  min-width: 300px;
  border-right: 1px solid var(--border-color);
  background-color: var(--background-secondary);
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
  height: 100%;
  overflow-y: auto;
}

/* Global styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}
</style>