<template>
  <div 
    class="message"
    :class="{
      'message-user': isUser,
      'message-assistant': !isUser,
      'message-error': error
    }"
  >
    <div class="message-content">
      <div v-if="!typing" v-html="formattedContent"></div>
      <div v-else class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it';
import { computed } from 'vue';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})

const props = defineProps<{
  content: string
  isUser: boolean
  typing?: boolean
  error?: boolean
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
.message-content {
  font-size: 14px;
  line-height: 1.5;
}

.message-content p {
  margin: var(--spacing-xs) 0;
}

.message-content p:first-child {
  margin-top: 0;
}

.message-content p:last-child {
  margin-bottom: 0;
}

.message-content table {
  border-collapse: collapse;
  margin: var(--spacing-md) 0;
  width: 100%;
  font-size: 13px;
}

.message-content th,
.message-content td {
  border: 1px solid var(--border-color);
  padding: var(--spacing-xs) var(--spacing-sm);
  text-align: left;
}

.message-content th {
  background-color: var(--background-elevated);
  font-weight: 600;
}

.message-content tr:nth-child(even) {
  background-color: var(--background-secondary);
}

.message-content code {
  background-color: var(--background-elevated);
  padding: 0.2em 0.4em;
  border-radius: var(--radius-sm);
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: var(--accent-primary);
}

.message-content pre {
  background-color: var(--background-elevated);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--spacing-md) 0;
  border: 1px solid var(--border-color);
}

.message-content pre code {
  background-color: transparent;
  padding: 0;
  color: var(--text-primary);
}

.message-content ul,
.message-content ol {
  padding-left: var(--spacing-lg);
  margin: var(--spacing-sm) 0;
}

.message-content li {
  margin: var(--spacing-xs) 0;
}

.message-content a {
  color: var(--accent-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color var(--transition-fast);
}

.message-content a:hover {
  border-bottom-color: var(--accent-primary);
}

.message-content blockquote {
  border-left: 3px solid var(--accent-primary);
  margin: var(--spacing-md) 0;
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: var(--background-elevated);
  color: var(--text-secondary);
}

/* Scoped styles */
.message {
  padding: 8px 0;
  transition: background-color 0.15s ease;
  position: relative;
  width: 100%;
  margin: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.message:hover {
  background-color: var(--cusor-hover-color, #181818);
}

.message.message-user {
  background-color: var(--cusor-hover-color-on-hover, #282828);
}

.message-content {
  max-width: 880px;
  margin: 0 auto;
  padding: 0 32px;
  width: 100%;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  text-align: left;
}

.message-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
}

.message-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}

.message-content :deep(code) {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 2px 5px;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
}

.message-content :deep(.tool-call) {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}

/* Markdown content styles */
.message-content :deep(p) {
  margin: 8px 0;
  line-height: 1.5;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 4px 0;
  padding-left: 24px;
}

.message-content :deep(li) {
  margin: 2px 0;
  line-height: 1.5;
  position: relative;
}

.message-content :deep(li) > p {
  margin: 0;
}

.message-content :deep(li) > ul,
.message-content :deep(li) > ol {
  margin-top: 2px;
  margin-bottom: 2px;
  margin-left: 0;
  padding-left: 24px;
}

.message-content :deep(ul) {
  list-style: none;
}

.message-content :deep(ul) > li {
  padding-left: 16px;
}

.message-content :deep(ul) > li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: rgba(255, 255, 255, 0.5);
}

.message-content :deep(ul ul) {
  margin-left: 0;
}

.message-content :deep(ul ul > li::before) {
  content: "◦";
}

.message-content :deep(ul ul ul > li::before) {
  content: "▪";
}

.message-content :deep(ol) {
  counter-reset: item;
  list-style: none;
}

.message-content :deep(ol) > li {
  counter-increment: item;
  padding-left: 16px;
}

.message-content :deep(ol) > li::before {
  content: counter(item) ".";
  position: absolute;
  left: 0;
  color: rgba(255, 255, 255, 0.5);
}

.message-content :deep(a) {
  color: #4B9EF9;
  text-decoration: none;
}

.message-content :deep(a:hover) {
  text-decoration: underline;
}

.message-content :deep(blockquote) {
  margin: 8px 0;
  padding: 8px 12px;
  border-left: 3px solid rgba(75, 158, 249, 0.5);
  background-color: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.7);
}

.message-content :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
}

.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  text-align: left;
}

.message-content :deep(th) {
  background-color: rgba(0, 0, 0, 0.2);
  font-weight: 600;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  width: fit-content;
}

.typing-dot {
  width: 4px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: typingBounce 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingBounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}
</style>