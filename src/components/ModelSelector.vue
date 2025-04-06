<template>
  <div class="model-selector">
    <span class="model-label">Model:</span>
    <div class="select-wrapper">
      <select 
        class="model-select" 
        v-model="selectedModel"
        @change="handleModelChange"
        :disabled="loading"
      >
        <option value="" disabled>{{ loading ? 'Loading models...' : 'Select a model' }}</option>
        <option 
          v-for="model in models" 
          :key="model.id" 
          :value="model.id"
          :title="model.description"
        >
          {{ model.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

const models = ref<ModelInfo[]>([])
const selectedModel = ref('')
const loading = ref(true)

const emit = defineEmits<{
  (e: 'modelChange', modelId: string): void
}>()

const handleModelChange = async () => {
  if (!selectedModel.value) return
  
  try {
    await window.electronAPI.setModel(selectedModel.value)
    emit('modelChange', selectedModel.value)
  } catch (error) {
    console.error('Failed to set model:', error)
  }
}

onMounted(async () => {
  try {
    const result = await window.electronAPI.getAvailableModels()
    
    if (result.success && result.models) {
      models.value = result.models

      const currentModel = await window.electronAPI.getCurrentModel()
      if (currentModel.success && currentModel.model) {
        selectedModel.value = currentModel.model
      } else if (models.value.length > 0) {
        selectedModel.value = models.value[0].id
      }
    }
  } catch (error) {
    console.error('Failed to load models:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.model-selector {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #CCCCCC;
}

.model-label {
  font-weight: 500;
  color: #808080;
}

.model-select {
  appearance: none;
  background-color: #2D2D2D;
  border: 1px solid #404040;
  border-radius: 6px;
  color: #FFFFFF;
  padding: 6px 28px 6px 12px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 160px;
}

.model-select:hover {
  background-color: #333333;
  border-color: #4B9EF9;
}

.model-select:focus {
  outline: none;
  border-color: #4B9EF9;
  box-shadow: 0 0 0 2px rgba(75, 158, 249, 0.3);
}

.select-wrapper {
  position: relative;
  display: inline-block;
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid #808080;
  pointer-events: none;
}

/* 옵션 스타일링 */
.model-select option {
  background-color: #2D2D2D;
  color: #FFFFFF;
  padding: 8px 12px;
}

/* 로딩 상태일 때의 스타일 */
.model-select:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background-color: #252525;
  border-color: #333333;
}

/* 옵션이 비활성화되었을 때의 스타일 */
.model-select option:disabled {
  color: #666666;
  font-style: italic;
}
</style>