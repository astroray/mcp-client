<template>
  <div class="chat-container">
    <div
      ref="messagesContainer"
      class="messages"
    >
      <template
        v-for="(message, index) in messages"
        :key="index"
      >
        <ChatMessage
          v-if="message.isUser || (!message.isToolExecution && !message.isUser)"
          :content="message.content"
          :is-user="message.isUser"
          :is-streaming="message.isStreaming"
        />
        <ToolExecutionCard
          v-else-if="message.isToolExecution"
          :tool-name="message.toolName || ''"
          :content="message.content || ''"
          :is-executing="message.isExecuting || false"
          :has-error="message.hasError || false"
          :error-message="message.errorMessage || ''"
          :input-json="message.inputJson || ''"
        />
      </template>
    </div>
    <div class="input-wrapper">
      <div class="model-controls">
        <div class="control-group">
          <ModelSelector @model-change="handleModelChange" />
        </div>
        <div
          v-if="!isConnected"
          class="connection-status"
        >
          <span class="warning-icon">⚠️</span>
          No servers connected - some tools may be unavailable
        </div>
      </div>
      <div class="input-container">
        <textarea
          v-model="currentMessage"
          :disabled="isProcessing"
          placeholder="메시지를 입력하세요..."
          rows="4"
          @keydown.enter.prevent="sendMessage(currentMessage)"
        />
        <button
          :disabled="!isProcessing && !currentMessage.trim()"
          :class="['send-button', { 'stop-button': isProcessing }]"
          @click="isProcessing ? stopProcessing() : sendMessage()"
        >
          {{ isProcessing ? 'Stop' : 'Send' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import type { QueryRequest, QueryResponse } from '../../types/bridge';
import ChatMessage from './ChatMessage.vue';
import ModelSelector from './ModelSelector.vue';
import ToolExecutionCard from './ToolExecutionCard.vue';

interface Server {
  name: string;
  connected: boolean;
  tools: string[];
}

interface Message {
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
  isToolExecution?: boolean;
  toolName?: string;
  isExecuting?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  inputJson?: string;
  timestamp?: Date;
  isError?: boolean;
  isTool?: boolean;
}

defineProps<{
  isConnected: boolean
}>();

const messages = ref<Message[]>([]);
const currentMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isProcessing = ref(false);
const servers = ref<Server[]>([]);

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const handleModelChange = async (modelId: string) => {
  try {
    await window.electronAPI.setModel(modelId);
  } catch (error) {
    messages.value.push({
      content: `Error setting model: ${(error as Error).message}`,
      isUser: false,
      hasError: true,
      toolName: '',
      isExecuting: false,
      inputJson: '',
      timestamp: new Date()
    });
  }
};

const updateServerStatus = (status: { serverName: string; connected: boolean; tools: string[] }) => {
  const existingServer = servers.value.find(s => s.name === status.serverName);
  if (existingServer) {
    existingServer.connected = status.connected;
    existingServer.tools = status.tools;
  } else {
    servers.value.push({
      name: status.serverName,
      connected: status.connected,
      tools: status.tools
    });
  }
};

// 서버 상태 업데이트 리스너 설정
const statusCleanup = window.electronAPI.onServerStatus(updateServerStatus);

// 먼저 스트림 데이터 리스너 설정
const streamCleanup = window.electronAPI.onStreamData((response: QueryResponse) => {
  // console.log('스트림 데이터 수신:', response);

  switch (response.type) {
    case 'text':
      {
        // 텍스트 메시지 처리
        const text = response.content || '';
        // console.log('텍스트 수신:', text);

        const lastMessage = messages.value[messages.value.length - 1];
        if (!lastMessage || lastMessage.isToolExecution || !lastMessage.isStreaming) {
          // console.log('새 메시지 생성');
          messages.value.push({
            content: text,
            isUser: false,
            isStreaming: true
          });
        } else {
          // console.log('기존 메시지에 추가');
          lastMessage.content = text;
        }
      }
      break;
    case 'tool_start':
      {
        console.log('도구 실행 시작');
        messages.value.push({
          content: '',
          isUser: false,
          isToolExecution: true,
          toolName: response.toolName,
          isExecuting: true,
          hasError: false,
          inputJson: response.args
        });
      }
      break;
    case 'tool_result':
      {
        console.log('도구 실행 결과:', response);

        // 해당 도구의 실행 카드 찾기
        const resultTool = messages.value.find(m =>
          m.isToolExecution &&
          m.toolName === response.toolName &&
          m.isExecuting
        );

        if (resultTool) {
          resultTool.isExecuting = false;
          if (response.result !== undefined) {
            try {
              // 파라미터와 결과를 함께 표시
              resultTool.content = response.result;
            } catch (error) {
              console.error('도구 실행 결과 JSON 파싱 오류:', error);
              resultTool.content = 'No result';
            }
          }
        } else {
          console.warn('도구 실행 카드를 찾을 수 없음:', response.toolName);
        }
      }
      break;
    case 'tool_error':
      {
        console.log('도구 실행 오류:', response);
        // 해당 도구의 실행 카드 찾기
        const errorTool = messages.value.find(m =>
          m.isToolExecution &&
          m.toolName === response.toolName
        );

        if (errorTool) {
          errorTool.isExecuting = false;
          errorTool.hasError = true;
          errorTool.errorMessage = response.error || 'Unknown error';
        }
      }
      break;
  }
});

// 컴포넌트 언마운트 시 리스너 정리
onUnmounted(() => {
  statusCleanup();
  streamCleanup();
});

watch(() => messages.value.length, scrollToBottom);
watch(() => messages.value[messages.value.length - 1]?.content, scrollToBottom);

const sendMessage = async (message: string = currentMessage.value.trim()) => {
  if (!message || isProcessing.value) return;

  isProcessing.value = true;
  currentMessage.value = '';
  messages.value.push({ content: message, isUser: true });

  const queryRequest: QueryRequest = {
    query: message
  };

  try {
    await window.electronAPI.startQuery(queryRequest);
  } catch (error) {
    console.error('Error processing query:', error);
    messages.value.push({
      content: `오류: ${error instanceof Error ? error.message : String(error)}`,
      isUser: false,
      hasError: true
    });
  } finally {
    isProcessing.value = false;
  }
};

const stopProcessing = async () => {
  try {
    await window.electronAPI.stopStream();
  } catch (error) {
    messages.value.push({
      content: `오류: ${error instanceof Error ? error.message : String(error)}`,
      isUser: false,
      isError: true,
      timestamp: new Date()
    });
  }
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1E1E1E;
  position: relative;
  max-width: 100%;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 2px;
}

.input-wrapper {
  position: relative;
  background-color: #1E1E1E;
  border-top: 1px solid #333333;
  margin: 0;
  border-radius: 0;
}

.model-controls {
  padding: var(--spacing-sm) var(--spacing-xl);
  border-bottom: 1px solid #333333;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  background-color: #1E1E1E;
}

.control-group {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.connection-status {
  color: #FFB86C;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: rgba(255, 184, 108, 0.1);
  border-radius: 4px;
}

.warning-icon {
  font-size: 1.1rem;
}

.input-container {
  padding: var(--spacing-md) var(--spacing-xl);
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  background-color: #1E1E1E;
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.input-container textarea {
  flex: 1;
  padding: 12px 16px;
  background-color: #2D2D2D;
  border: 1px solid #404040;
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  transition: all 0.2s ease;
  min-height: 24px;
  max-height: 200px;
  font-family: inherit;
}

.input-container textarea:focus {
  outline: none;
  border-color: #4B9EF9;
  background-color: #2D2D2D;
  box-shadow: 0 0 0 2px rgba(75, 158, 249, 0.3);
}

.input-container textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #252525;
}

.send-button {
  padding: 8px 16px;
  background-color: #4B9EF9;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 80px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
}

.send-button:not(:disabled):hover {
  background-color: #3B8EE9;
}

.send-button:disabled {
  background-color: #2D2D2D;
  color: #808080;
}

.send-button.stop-button {
  background-color: #DC3545;
}

.send-button.stop-button:hover {
  background-color: #BB2D3B;
}

/* Remove shadow overlays */
.messages::before,
.messages::after {
  display: none;
}
</style>