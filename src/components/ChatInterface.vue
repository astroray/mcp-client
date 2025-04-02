<template>
  <div class="chat-container">
    <div class="messages" ref="messagesContainer">
      <ChatMessage
        v-for="(message, index) in messages"
        :key="index"
        :content="message.content"
        :is-user="message.isUser"
        :is-streaming="message.isStreaming"
      />
    </div>
    <div class="input-wrapper">
      <div class="model-controls">
        <ModelSelector @modelChange="handleModelChange" />
        <div class="connection-status" v-if="!isConnected">
          <span class="warning-icon">⚠️</span>
          No servers connected - some tools may be unavailable
        </div>
      </div>
      <div class="input-container">
        <textarea
          v-model="currentMessage"
          @keydown.enter.prevent="sendMessage"
          :disabled="isProcessing"
          placeholder="Type your message here..."
          rows="3"
        ></textarea>
        <button 
          @click="sendMessage" 
          :disabled="isProcessing || !currentMessage.trim()"
          class="send-button"
        >
          {{ isProcessing ? 'Processing...' : 'Send' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import ChatMessage from './ChatMessage.vue';
import ModelSelector from './ModelSelector.vue';

defineProps<{
  isConnected: boolean
}>()

interface Message {
  content: string
  isUser: boolean
  isStreaming?: boolean
}

const messages = ref<Message[]>([])
const currentMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const isProcessing = ref(false)

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const handleModelChange = async (modelId: string) => {
  try {
    await window.electronAPI.setModel(modelId)
  } catch (error) {
    messages.value.push({ 
      content: `Error setting model: ${(error as Error).message}`, 
      isUser: false 
    })
  }
}

watch(() => messages.value.length, scrollToBottom)
watch(() => messages.value[messages.value.length - 1]?.content, scrollToBottom)

const sendMessage = async () => {
  const message = currentMessage.value.trim()
  if (!message || isProcessing.value) return

  isProcessing.value = true
  messages.value.push({ content: message, isUser: true })
  currentMessage.value = ''

  try {
    // Add a placeholder message for the assistant's response
    const responseIndex = messages.value.length
    messages.value.push({ 
      content: '', 
      isUser: false,
      isStreaming: true 
    })

    // Set up streaming response handler
    const cleanup = window.electronAPI.onStreamData((chunk: string) => {
      messages.value[responseIndex].content += chunk
    })

    // Start the streaming process
    const result = await window.electronAPI.processQueryStream(message)
    
    if (!result.success) {
      throw new Error(result.error)
    }

    // Clean up stream handler
    cleanup()
    messages.value[responseIndex].isStreaming = false

  } catch (error) {
    messages.value.push({ 
      content: `Error: ${(error as Error).message}`, 
      isUser: false 
    })
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  scroll-behavior: smooth;
}

.input-wrapper {
  border-top: 1px solid var(--border-color);
  background-color: var(--background-tertiary);
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
}

.model-controls {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.connection-status {
  color: var(--warning);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.warning-icon {
  font-size: 1.1rem;
}

.input-container {
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
}

.input-container textarea {
  flex: 1;
  padding: 0.75rem 1rem;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.5;
  resize: none;
  transition: all var(--transition-fast);
}

.input-container textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.input-container textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background-color: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  align-self: flex-end;
  min-width: 100px;
}

.send-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.send-button:active:not(:disabled) {
  background-color: var(--accent-active);
}

.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>