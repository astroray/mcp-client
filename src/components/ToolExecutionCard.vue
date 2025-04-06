<template>
  <div
    class="tool-execution-card"
    :class="{ 'is-executing': isExecuting }"
  >
    <div
      class="card-header"
      @click="toggleExpanded"
    >
      <div class="tool-info">
        <div class="tool-status">
          <span
            v-if="isExecuting"
            class="executing-icon"
          >⚡</span>
          <span
            v-else-if="hasError"
            class="error-icon"
          >❌</span>
          <span
            v-else
            class="success-icon"
          >✓</span>
        </div>
        <div class="tool-name">
          {{ toolName }}
        </div>
      </div>
      <button class="expand-button">
        {{ isExpanded ? '▼' : '▶' }}
      </button>
    </div>
    <div
      v-if="isExpanded"
      class="tool-content"
    >
      <div class="section-label">
        입력 매개변수:
      </div>
      <div
        v-if="parsedInput"
        class="json-viewer"
      >
        <vue-json-pretty
          :data="parsedInput"
          :deep="2"
          :show-double-quotes="true"
          :show-length="true"
          :show-line="false"
        />
      </div>
      <div
        v-else
        class="empty-input"
      >
        없음
      </div>
      <div
        v-if="hasError"
        class="error-section"
      >
        <div class="section-header error">
          <span class="error-icon">❌</span>
          실행 오류 발생
        </div>
        <div class="error-details">
          {{ errorMessage }}
        </div>
      </div>
      <div
        v-else
        class="result-section"
      >
        <div class="section-label">
          실행 결과:
        </div>
        <div
          v-if="content"
          class="json-viewer"
        >
          <div class="result-details">
            {{ content }}
          </div>
        </div>
        <div
          v-else
          class="empty-input"
        >
          없음
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

const props = defineProps<{
  toolName: string;
  content: string;
  isExecuting: boolean;
  hasError: boolean;
  errorMessage?: string;
  inputJson?: string;
}>();

const isExpanded = ref(false);

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const parsedInput = computed(() => {
  if (!props.inputJson || props.inputJson === '{}') {
    return null;
  }
  try {
    return JSON.parse(props.inputJson);
  } catch {
    return { error: "Invalid JSON input" };
  }
});

</script>

<style scoped>
.tool-execution-card {
  margin: 8px auto;
  width: 90%;
  max-width: 800px;
  background-color: #1E1E1E;
  border: 1px solid #333333;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.card-header {
  padding: 12px;
  background-color: #252525;
  border-bottom: 1px solid #333333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.tool-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #1E1E1E;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  font-weight: 500;
}

.section-header.executing {
  background-color: #1a365d;
  color: #4B9EF9;
}

.section-header.success {
  background-color: #1a4731;
  color: #34D399;
}

.section-header.error {
  background-color: #771D1D;
  color: #F87171;
}

.section-label {
  font-weight: 500;
  color: #808080;
  margin-bottom: 4px;
}

.json-viewer {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  background-color: #252525;
  padding: 12px;
  border-radius: 4px;
  overflow: auto;
  max-height: 400px;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-input {
  color: #808080;
  font-style: italic;
  padding: 8px;
  background-color: #252525;
  border-radius: 4px;
}

.error-section {
  color: #F87171;
  background-color: #771D1D;
  padding: 12px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}

.executing-section,
.result-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-status {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.executing-icon {
  color: #4B9EF9;
}

.error-icon {
  color: #DC3545;
}

.success-icon {
  color: #28A745;
}

.tool-name {
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

.error-details {
  color: #DC3545;
  padding: 8px;
  background-color: rgba(220, 53, 69, 0.1);
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.result-details {
  color: #FFFFFF;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  text-align: left;
}
</style>