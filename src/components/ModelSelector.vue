<template>
  <div class="model-selector">
    <select 
      v-model="selectedModel"
      class="model-select"
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
  console.log('ModelSelector: onMounted called')
  try {
    // Get available models
    const result = await window.electronAPI.getAvailableModels()
    console.log('ModelSelector: getAvailableModels result:', result)
    
    if (result.success && result.models) {
      models.value = result.models
      console.log('ModelSelector: models loaded:', models.value)

      // Get current model
      const currentModel = await window.electronAPI.getCurrentModel()
      if (currentModel.success && currentModel.model) {
        selectedModel.value = currentModel.model
      } else if (models.value.length > 0) {
        // If no current model is set, select the first available model
        selectedModel.value = models.value[0].id
        await handleModelChange()
      }
    }
  } catch (error) {
    console.error('Failed to load models:', error)
  } finally {
    loading.value = false
    console.log('ModelSelector: loading complete, loading=false')
  }
})
</script>

<style scoped>
.model-selector {
  position: relative;
  min-width: 200px;
  max-width: 300px;
  width: 100%;
}

.model-select {
  width: 100%;
  padding: 0.75rem 2rem 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  font-size: 0.95rem;
  appearance: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.2em;
}

.model-select:hover:not(:disabled) {
  border-color: var(--accent-primary);
}

.model-select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(var(--accent-primary-rgb), 0.2);
}

.model-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.model-select option {
  background-color: var(--background-secondary);
  color: var(--text-primary);
  padding: 8px;
}
</style>