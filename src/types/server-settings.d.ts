export interface ServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPServerSettings {
  modelProvider: {
    apiKey: string;
  }
  mcpServers: {
    [key: string]: ServerConfig;
  };
}