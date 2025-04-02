<template>
  <div class="server-connection">
    <div class="servers-list">
      <h3>Connected Servers</h3>
      <div class="server-items">
        <div v-for="(status, serverName) in serverStatus" :key="serverName" class="server-item">
          <div class="server-header">
            <div class="status-badge">
              <span class="status-dot" :class="{ 'connected': status.connected }"></span>
              {{ serverName }}
            </div>
          </div>
          <div v-if="status.connected" class="tools-list">
            <div class="tools-grid">
              <div v-for="tool in status.tools" :key="tool" class="tool-item">
                {{ tool }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface ServerStatus {
  [key: string]: {
    connected: boolean;
    tools: string[];
  };
}

const serverStatus = ref<ServerStatus>({})
const error = ref('')

let cleanup: (() => void) | null = null

onMounted(() => {
  cleanup = window.electronAPI.onServerStatus((status) => {
    serverStatus.value[status.serverName] = {
      connected: status.connected,
      tools: status.tools
    }
  })
})

onUnmounted(() => {
  cleanup?.()
})
</script>

<style scoped>
.server-connection {
  background-color: var(--background-secondary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
}

.servers-list h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 500;
}

.server-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.server-item {
  background-color: var(--background-tertiary);
  border-radius: var(--radius-md);
  padding: 1rem;
}

.server-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-disabled);
}

.status-dot.connected {
  background-color: var(--success);
  animation: pulse 2s infinite;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.tool-item {
  background-color: var(--background-primary);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: all var(--transition-fast);
}

.tool-item:hover {
  background-color: var(--background-secondary);
  color: var(--text-primary);
}

.error {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  background-color: rgba(255, 59, 48, 0.1);
  color: var(--error);
  font-size: 0.9rem;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>