export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

export interface ElectronAPI {
  // Model management
  getAvailableModels: () => Promise<{ success: boolean; models?: ModelInfo[]; error?: string }>;
  setModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
  getCurrentModel: () => Promise<{ success: boolean; model?: string; error?: string }>;
  
  // Server management
  getAvailableServers: () => Promise<{ success: boolean; servers?: string[]; error?: string }>;
  requestServerStatus: () => Promise<{ success: boolean; error?: string }>;
  
  // Query handling
  processQueryStream: (query: string) => Promise<{ success: boolean; response?: string; error?: string }>;
  
  // Cleanup
  cleanup: () => Promise<{ success: boolean; error?: string }>;
  
  // Event listeners
  onServerStatus: (callback: (status: { serverName: string; connected: boolean; tools: string[] }) => void) => () => void;
  onStreamData: (callback: (data: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}