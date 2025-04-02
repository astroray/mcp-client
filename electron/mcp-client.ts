import { Anthropic } from "@anthropic-ai/sdk";
import { Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { ModelInfo } from '../src/types/electron';
import { MCPServerSettings, ServerConfig } from '../src/types/server-settings';

interface ServerConnection {
  name: string;
  transport: StdioClientTransport;
  client: Client;
  tools: Tool[];
}

interface StreamMessage {
  role: "user";
  content: string;
}

interface ToolCall {
  name: string;
  args: any;
  jsonInput: string;
}

const DEFAULT_MODEL_NAME = 'Claude 3.5 Haiku';

// Define log levels with their corresponding emojis
const LogLevel = {
  INFO: '📝',
  SUCCESS: '✅',
  ERROR: '❌',
  WARN: '⚠️',
  DEBUG: '🔍',
  TOOL: '🛠️',
  NETWORK: '🌐',
  DATA: '📦'
} as const;

dotenv.config();

export class MCPClient {
  private anthropic: Anthropic;
  private serverSettings: MCPServerSettings;
  private currentModel: string | null = null;
  private availableModels: ModelInfo[] = [];
  private serverConnections: Map<string, ServerConnection> = new Map();

  constructor() {
    this.loadServerSettings();

    const apiKey = this.serverSettings.modelProvider.apiKey;
    if (!apiKey) {
      throw new Error("modelProvider.apiKey is not set in environment variables");
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  private log(level: keyof typeof LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toLocaleString('en-US', {
      hour12: false,
      timeZoneName: 'short'
    });

    const emoji = LogLevel[level];
    const formattedArgs = args.map(arg =>
      typeof arg === 'object' ?
        util.inspect(arg, {
          depth: null,
          colors: true,
          maxArrayLength: null,
          breakLength: 120,
          compact: true
        }) :
        arg
    );

    console.log(`[${timestamp}] ${emoji} ${message}`, ...formattedArgs);
  }

  private logError(message: string, error: any): void {
    const timestamp = new Date().toLocaleString('en-US', {
      hour12: false,
      timeZoneName: 'short'
    });

    const stack = error instanceof Error ?
      error.stack :
      util.inspect(error, {
        depth: null,
        colors: true,
        breakLength: 120,
        compact: true
      });

    console.error(`[${timestamp}] ${LogLevel.ERROR} ${message}:`, stack);
  }

  private loadServerSettings(): void {
    const settingsPath = path.join(process.cwd(), 'server-settings.json');

    try {
      this.serverSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as MCPServerSettings;
      this.log('INFO', 'Server settings loaded:', this.serverSettings);
    } catch (error) {
      this.log('WARN', 'Creating default server settings file');
      // Create default settings file
      const defaultSettings: MCPServerSettings = {
        modelProvider: {
          apiKey: ""
        },
        mcpServers: {}
      };
      this.serverSettings = defaultSettings;

      try {
        fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
        this.log('SUCCESS', 'Created default server settings at:', settingsPath);
      } catch (writeError) {
        this.logError('Failed to create default server settings file', writeError);
      }
    }
  }

  async initialize(): Promise<{ name: string, tools: string[] }[]> {
    this.log('INFO', 'Initializing MCPClient...');
    const results: { name: string, tools: string[] }[] = [];

    this.log('DEBUG', 'Available servers:', Object.keys(this.serverSettings.mcpServers));
    for (const [serverName, config] of Object.entries(this.serverSettings.mcpServers)) {
      this.log('INFO', `Attempting to connect to server: ${serverName}`);
      try {
        const tools = await this.connectToServer(serverName, config);
        this.log('SUCCESS', `Connected to ${serverName} with tools:`, tools);
        results.push({ name: serverName, tools });
      } catch (error) {
        this.logError(`Failed to connect to server ${serverName}`, error);
      }
    }

    await this.loadModels();
    return results;
  }

  async loadModels(): Promise<ModelInfo[]> {
    try {
      const models = await this.anthropic.models.list({
        limit: 20,
      });

      this.availableModels = models.data.map(model => ({
        id: model.id,
        name: model.display_name || model.id,
        description: model.id,
      }));

      const defaultModel = this.availableModels.find(m => m.name === DEFAULT_MODEL_NAME) ||
        this.availableModels[0];

      if (defaultModel) {
        this.currentModel = defaultModel.id;
        this.log('SUCCESS', 'Set default model to:', defaultModel.name);
      }

      this.log('INFO', 'Available models:', this.availableModels);
      return this.availableModels;
    } catch (error) {
      this.logError('Failed to load models', error);
      throw error;
    }
  }

  private async connectToServer(serverName: string, config: ServerConfig): Promise<string[]> {
    this.log('NETWORK', `Connecting to server ${serverName}...`);

    try {
      if (config.env?.MEMORY_FILE_PATH) {
        const memoryDir = path.dirname(config.env.MEMORY_FILE_PATH);
        if (!fs.existsSync(memoryDir)) {
          fs.mkdirSync(memoryDir, { recursive: true });
          this.log('INFO', `Created memory directory: ${memoryDir}`);
        }
      }

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env
      });

      const client = new Client({
        name: `mcp-client-electron-${serverName}`,
        version: "1.0.0"
      });

      const connection: ServerConnection = {
        name: serverName,
        transport,
        client,
        tools: []
      };

      this.log('NETWORK', `Initializing connection to ${serverName}`);
      connection.client.connect(transport);

      const toolsResult = await connection.client.listTools();
      connection.tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));

      this.serverConnections.set(serverName, connection);
      this.log('SUCCESS', `Connected to ${serverName} with ${connection.tools.length} tools`);

      return connection.tools.map(tool => tool.name);
    } catch (error) {
      this.logError(`Failed to connect to server ${serverName}`, error);
      this.serverConnections.delete(serverName);
      throw error;
    }
  }

  getAvailableModels(): ModelInfo[] {
    return this.availableModels;
  }

  setModel(model: string): void {
    if (!this.availableModels.some(m => m.id === model)) {
      throw new Error(`Invalid model: ${model}`);
    }
    this.currentModel = model;
    this.log('INFO', 'Model set to:', model);
  }

  getCurrentModel(): string {
    if (!this.currentModel || !this.availableModels.some(m => m.id === this.currentModel)) {
      const defaultModel = this.availableModels.find(m => m.name === DEFAULT_MODEL_NAME) ||
        this.availableModels[0];
      if (!defaultModel) {
        throw new Error('No models available');
      }
      this.currentModel = defaultModel.id;
    }
    return this.currentModel;
  }

  getAvailableServers(): string[] {
    return Array.from(this.serverConnections.keys());
  }

  getServerTools(serverName: string): string[] | null {
    const connection = this.serverConnections.get(serverName);
    if (!connection) return null;
    return connection.tools.map(tool => tool.name);
  }

  private getAppropriateServer(tool: string): ServerConnection | null {
    for (const connection of this.serverConnections.values()) {
      if (connection.tools.some(t => t.name === tool)) {
        return connection;
      }
    }
    return null;
  }

  private async processJsonDelta(toolCall: ToolCall, delta: any): Promise<void> {
    if (delta?.type === 'input_json_delta' && delta.partial_json !== undefined) {
      toolCall.jsonInput += delta.partial_json;
      this.log('DATA', 'Accumulated JSON input:', toolCall.jsonInput);
    }
  }

  private async executeToolCall(toolCall: ToolCall): Promise<string | null> {
    try {
      const server = this.getAppropriateServer(toolCall.name);
      if (!server) {
        throw new Error(`No server found that provides tool: ${toolCall.name}`);
      }

      this.log('TOOL', `Executing ${toolCall.name} with args:`, toolCall.args);
      const result = await server.client.callTool({
        name: toolCall.name,
        arguments: toolCall.args,
      });

      this.log('SUCCESS', `Tool ${toolCall.name} executed successfully:`, result);
      return result.content as string;
    } catch (error) {
      this.logError(`Error executing tool ${toolCall.name}`, error);
      throw error;
    }
  }

  private async *handleToolCall(toolCall: ToolCall, messages: StreamMessage[]): AsyncGenerator<string> {
    try {
      yield `\n[Calling tool ${toolCall.name}...]\n`;

      const result = await this.executeToolCall(toolCall);
      if (result) {
        messages.push({ role: "user", content: result });
        this.log('INFO', 'Tool result added to messages');

        const stream = await this.anthropic.messages.stream({
          model: this.getCurrentModel(),
          max_tokens: 1000,
          messages,
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_start' || chunk.type === 'content_block_delta') {
            if (chunk.delta?.text) {
              yield chunk.delta.text;
            }
          }
        }
      }
    } catch (error) {
      this.logError(`Error executing tool ${toolCall.name}`, error);
      yield `\nError executing tool ${toolCall.name}: ${error}\n`;
    }
  }

  async *processQueryStream(query: string): AsyncGenerator<string> {
    this.log('INFO', 'Processing query:', query);
    const messages: StreamMessage[] = [{ role: "user", content: query }];
    const allTools = Array.from(this.serverConnections.values())
      .flatMap(conn => conn.tools);

    this.log('DEBUG', 'Available tools:', allTools.map(t => t.name));

    const stream = await this.anthropic.messages.stream({
      model: this.getCurrentModel(),
      max_tokens: 1000,
      messages,
      tools: allTools,
    });

    let pendingToolCall: ToolCall | null = null;

    for await (const chunk of stream) {
      this.log('DEBUG', 'Received chunk:', chunk);

      if (chunk.type === 'content_block_start') {
        if (chunk.content_block.type === 'tool_use') {
          pendingToolCall = {
            name: chunk.content_block.name,
            args: chunk.content_block.input || {},
            jsonInput: ''
          };
          this.log('TOOL', 'Starting tool call:', pendingToolCall);
        } else if (chunk.delta?.text) {
          yield chunk.delta.text;
        }
      } else if (chunk.type === 'content_block_delta') {
        if (chunk.delta?.text) {
          yield chunk.delta.text;
        }
        if (pendingToolCall) {
          await this.processJsonDelta(pendingToolCall, chunk.delta);
          if (chunk.delta?.type === 'input_json_delta') {
            this.log('DATA', 'Accumulated JSON delta:', chunk.delta.partial_json);
          }
        }
      } else if (chunk.type === 'content_block_stop' && pendingToolCall) {
        if (pendingToolCall.jsonInput) {
          try {
            pendingToolCall.args = JSON.parse(pendingToolCall.jsonInput);
            this.log('SUCCESS', 'Parsed tool arguments:', pendingToolCall.args);
          } catch (e) {
            this.logError('Failed to parse tool JSON input', e);
          }
        }

        for await (const text of this.handleToolCall(pendingToolCall, messages)) {
          yield text;
        }
        this.log('SUCCESS', 'Tool call completed:', pendingToolCall.name);
        pendingToolCall = null;
      }
    }
  }

  async cleanup(): Promise<void> {
    this.log('INFO', 'Cleaning up connections...');
    for (const connection of this.serverConnections.values()) {
      await connection.client.close();
    }
    this.serverConnections.clear();
    this.log('SUCCESS', 'All connections closed');
  }
}