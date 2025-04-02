<template>
  <div class="server-list">
    <div class="header">
      <h2>MCP Servers</h2>
    </div>
    <div class="servers">
      <div 
        v-for="(status, serverName) in serverStatus" 
        :key="serverName" 
        class="server-card"
      >
        <div 
          class="server-header"
          @click="toggleServer(serverName as string)"
        >
          <div class="server-name">
            <span 
              class="status-dot" 
              :class="{ 'connected': status.connected }"
              :title="status.connected ? 'Connected' : 'Disconnected'"
            ></span>
            {{ serverName }}
          </div>
          <button class="expand-button" :class="{ 'expanded': !collapsedServers[serverName] }">
            ▼
          </button>
        </div>
        <div class="tools-section" v-show="!collapsedServers[serverName]">
          <h4>Available Tools</h4>
          <div class="tools-list">
            <div 
              v-for="tool in status.tools" 
              :key="tool"
              class="tool-item"
              :title="tool"
            >
              {{ tool }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

interface ServerStatus {
  [key: string]: {
    connected: boolean;
    tools: string[];
  };
}

const serverStatus = ref<ServerStatus>({})
const collapsedServers = ref<Record<string, boolean>>({})

let cleanup: (() => void) | null = null

const toggleServer = (serverName: string) => {
  collapsedServers.value[serverName] = !collapsedServers.value[serverName]
}

onMounted(async () => {
  // Set up status update listener
  cleanup = window.electronAPI.onServerStatus((status) => {
    serverStatus.value[status.serverName] = {
      connected: status.connected,
      tools: status.tools
    }
    // Initialize collapse state for new servers - collapsed by default
    if (!(status.serverName in collapsedServers.value)) {
      collapsedServers.value[status.serverName] = true
    }
  })

  // Request current server status
  await window.electronAPI.requestServerStatus()
})

onUnmounted(() => {
  cleanup?.()
})
</script>

<style scoped>
.server-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.servers {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.server-card {
  background-color: var(--background-tertiary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.server-header {
  padding: 0.75rem 1rem;
  background-color: var(--background-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background-color var(--transition-fast);
}

.server-header:hover {
  background-color: var(--background-primary);
}

.server-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.expand-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast);
  width: 20px;
  height: 20px;
}

.expand-button.expanded {
  transform: rotate(180deg);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-disabled);
}

.status-dot.connected {
  background-color: var(--success);
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.2);
  animation: pulse 2s infinite;
}

.tools-section {
  padding: 0.75rem 1rem;
}

.tools-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.tools-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tool-item {
  padding: 0.5rem 0.75rem;
  background-color: var(--background-secondary);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.tool-item:hover {
  background-color: var(--background-primary);
  color: var(--text-primary);
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>