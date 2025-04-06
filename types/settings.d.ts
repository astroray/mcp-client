export interface ServerSettings {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface AppSettings {
  modelProvider: {
    apiKey: string;
  }
  mcpServers: {
    [key: string]: ServerSettings;
  };
}