export interface QueryRequest {
  query: string;
}

export interface TextQueryResponse {
  type: 'text';
  content: string;
}

export interface ToolStartQueryResponse {
  type: 'tool_start';
  toolName: string;
  args: string;
}

export interface ToolResultQueryResponse {
  type: 'tool_result';
  toolName: string;
  result: string;
}

export interface ToolErrorQueryResponse {
  type: 'tool_error';
  toolName: string;
  error: string;
}

export type QueryResponse = TextQueryResponse | ToolStartQueryResponse | ToolResultQueryResponse | ToolErrorQueryResponse;

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

export interface ElectronAPI {
  // Version info
  getVersion: () => string;

  // Model management
  getAvailableModels: () => Promise<{ success: boolean; models?: ModelInfo[]; error?: string }>;
  setModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
  getCurrentModel: () => Promise<{ success: boolean; model?: string; error?: string }>;

  // Server management
  getAvailableServers: () => Promise<{ success: boolean; servers?: string[]; error?: string }>;
  requestServerStatus: () => Promise<{ success: boolean; error?: string }>;

  // Query handling
  startQuery(request: QueryRequest): Promise<void>;
  onStreamData(callback: (response: QueryResponse) => void): () => void;
  stopStream(): Promise<void>;

  // Cleanup
  cleanup: () => Promise<{ success: boolean; error?: string }>;

  // Event listeners
  onServerStatus: (callback: (status: { serverName: string; connected: boolean; tools: string[] }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}