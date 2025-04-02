import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Model management
  getAvailableModels: () => 
    ipcRenderer.invoke('mcp:get-models'),
  setModel: (modelId: string) =>
    ipcRenderer.invoke('mcp:set-model', modelId),
  getCurrentModel: () =>
    ipcRenderer.invoke('mcp:get-model'),
  
  // Server management
  getAvailableServers: () => 
    ipcRenderer.invoke('mcp:get-servers'),
  requestServerStatus: () =>
    ipcRenderer.invoke('mcp:request-status'),
  
  // Query handling
  processQueryStream: (query: string) => 
    ipcRenderer.invoke('mcp:query-stream', query),
  
  // Cleanup
  cleanup: () => 
    ipcRenderer.invoke('mcp:cleanup'),
  
  // Event listeners with cleanup functions
  onServerStatus: (callback: (status: { serverName: string; connected: boolean; tools: string[] }) => void) => {
    ipcRenderer.on('mcp:server-status', (_event, status) => callback(status))
    return () => {
      ipcRenderer.removeAllListeners('mcp:server-status')
    }
  },
  
  onStreamData: (callback: (data: string) => void) => {
    ipcRenderer.on('mcp:stream-data', (_event, data) => callback(data))
    return () => {
      ipcRenderer.removeAllListeners('mcp:stream-data')
    }
  }
})