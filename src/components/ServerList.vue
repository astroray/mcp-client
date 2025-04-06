<template>
  <div class="server-list">
    <div class="header">
      <div class="header-title">MCP Servers</div>
    </div>
    <div v-for="server in servers" :key="server.name" class="server-card" :class="{ 'is-connected': server.connected }">
      <div class="server-header" @click="toggleServer(server.name)">
        <div class="server-info">
          <div class="server-status">
            <span v-if="server.connected" class="connected-icon">●</span>
            <span v-else class="disconnected-icon">○</span>
          </div>
          <div class="server-name">{{ server.name }}</div>
        </div>
        <button class="expand-button">
          {{ expandedServers.includes(server.name) ? '▼' : '▶' }}
        </button>
      </div>
      <div v-if="expandedServers.includes(server.name)" class="server-content">
        <div class="tools-list">
          <div class="tools-header">사용 가능한 도구</div>
          <div v-if="server.tools.length === 0" class="no-tools">
            사용 가능한 도구가 없습니다.
          </div>
          <div v-else class="tool-items">
            <div v-for="tool in server.tools" :key="tool" class="tool-item">
              {{ tool }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Server {
  name: string;
  connected: boolean;
  tools: string[];
}

defineProps<{
  servers: Server[];
}>();

const expandedServers = ref<string[]>([]);

const toggleServer = (serverName: string) => {
  const index = expandedServers.value.indexOf(serverName);
  if (index === -1) {
    expandedServers.value.push(serverName);
  } else {
    expandedServers.value.splice(index, 1);
  }
};
</script>

<style scoped>
.server-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: #252525;

    .header-title {
      font-size: 14px;
      font-weight: 500;
      color: #FFFFFF;
      align-items: center;
    }
  }
}

.server-card {
  background-color: #2D2D2D;
  border: 1px solid #404040;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.server-card.is-connected {
  border-color: #28A745;
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #252525;
  cursor: pointer;
  user-select: none;
}

.server-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.server-status {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.connected-icon {
  color: #28A745;
}

.disconnected-icon {
  color: #DC3545;
}

.server-name {
  font-weight: 500;
  color: #FFFFFF;
}

.expand-button {
  background: none;
  border: none;
  color: #808080;
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
}

.server-content {
  padding: 16px;
  background-color: #2D2D2D;
}

.tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tools-header {
  font-size: 14px;
  font-weight: 500;
  color: #808080;
  margin-bottom: 8px;
}

.no-tools {
  color: #808080;
  font-style: italic;
  padding: 8px;
  background-color: #252525;
  border-radius: 4px;
}

.tool-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-item {
  padding: 8px;
  background-color: #252525;
  border-radius: 4px;
  color: #FFFFFF;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}
</style>