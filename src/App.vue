<template>
  <div class="app-container">
    <div class="sidebar">
      <ServerList :servers="servers" />
    </div>
    <div class="main-content">
      <ChatInterface :is-connected="isConnected" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import ChatInterface from './components/ChatInterface.vue'
import ServerList from './components/ServerList.vue'
import './styles/theme.css'

interface Server {
  name: string
  connected: boolean
  tools: string[]
}

const isConnected = ref(false)
const servers = ref<Server[]>([])

let cleanup: (() => void) | null = null

onMounted(() => {
  cleanup = window.electronAPI.onServerStatus((status) => {
    const existingServer = servers.value.find(s => s.name === status.serverName)
    if (existingServer) {
      existingServer.connected = status.connected
      existingServer.tools = status.tools
    } else {
      servers.value.push({
        name: status.serverName,
        connected: status.connected,
        tools: status.tools
      })
    }
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
/* Reset default styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.app-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  background-color: var(--background-primary);
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
}

.sidebar {
  height: 100%;
  width: 280px;
  min-width: 280px;
  border-right: 1px solid var(--border-color);
  background-color: var(--background-secondary);
  overflow-y: auto;
  transition: width var(--transition-normal);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--background-primary);
}

.main-content > * {
  padding: var(--spacing-lg);
}

/* Global styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sidebar {
    width: 240px;
    min-width: 240px;
  }

  .main-content > * {
    padding: var(--spacing-md);
  }
}

/* Animation for connection status */
@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.connected {
  animation: pulse 2s infinite;
}
</style>