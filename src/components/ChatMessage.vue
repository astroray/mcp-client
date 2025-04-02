<template>
  <div class="message" :class="{ 'message-user': isUser }">
    <div class="message-content">
      <div v-if="isStreaming && !isUser" class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div v-html="formattedContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})

const props = defineProps<{
  content: string
  isUser: boolean
  isStreaming?: boolean
}>()

const formattedContent = computed(() => {
  const lines = props.content.split('\n')
  const formattedLines = lines.map(line => {
    // Format tool calls differently
    if (line.startsWith('[Calling tool')) {
      return `<div class="tool-call">${line}</div>`
    }
    return line
  })
  const content = formattedLines.join('\n')
  
  // Parse markdown
  return md.render(content)
})
</script>

<style>
/* Use non-scoped styles for markdown content */
.message-content table {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}

.message-content th,
.message-content td {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  text-align: left;
}

.message-content th {
  background-color: var(--background-secondary);
  font-weight: bold;
}

.message-content tr:nth-child(even) {
  background-color: var(--background-tertiary);
}

.message-content code {
  background-color: var(--background-tertiary);
  padding: 0.2em 0.4em;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.9em;
}

.message-content pre {
  background-color: var(--background-tertiary);
  padding: 1em;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 1em 0;
}

.message-content pre code {
  background-color: transparent;
  padding: 0;
}
</style>

<style scoped>
.message {
  margin: 0.5rem;
  padding: 1rem;
  border-radius: var(--radius-lg);
  max-width: 80%;
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  animation: fadeIn var(--transition-normal);
}

.message-user {
  margin-left: auto;
  background-color: var(--accent-primary);
  color: white;
  box-shadow: var(--shadow-sm);
}

.message-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.95rem;
  line-height: 1.5;
}

.message-content :deep(.tool-call) {
  background-color: var(--background-secondary);
  padding: 0.5rem;
  margin: 0.5rem 0;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.9em;
}

.typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--background-secondary);
  border-radius: 12px;
  margin-bottom: 8px;
}

.typing-indicator span {
  width: 4px;
  height: 4px;
  background-color: var(--text-secondary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>