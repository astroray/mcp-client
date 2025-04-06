import { contextBridge, ipcRenderer } from 'electron';
import { QueryRequest, QueryResponse } from '../types/bridge';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Model management
  getAvailableModels: () => ipcRenderer.invoke('mcp:get-models'),
  setModel: (modelId: string) => ipcRenderer.invoke('mcp:set-model', modelId),
  getCurrentModel: () => ipcRenderer.invoke('mcp:get-model'),

  // Query handling
  startQuery: (request: QueryRequest, callback: (data: QueryResponse) => void) => ipcRenderer.invoke('mcp:start-query', request, callback),
  stopQuery: () => ipcRenderer.invoke('mcp:stop-query'),
  onStreamData: (callback: (data: QueryResponse) => void) => {
    ipcRenderer.on('mcp:stream-data', (_event, data: QueryResponse) => callback(data));
    return () => {
      ipcRenderer.removeAllListeners('mcp:stream-data');
    };
  },

  // Event listeners
  onServerStatus: (callback: (status: { serverName: string; connected: boolean; tools: string[] }) => void) => {
    ipcRenderer.on('mcp:server-status', (_event, status) => callback(status));
    return () => {
      ipcRenderer.removeAllListeners('mcp:server-status');
    };
  }
});