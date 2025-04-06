import { Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from 'fs';
import * as path from 'path';
import { version } from '../package.json';
import { QueryContext, QueryOptions, ServerConnection, ToolUseResponse } from "../types";
import { QueryResponse, ToolErrorQueryResponse, ToolResultQueryResponse } from "../types/bridge";
import { MCPModelProvider } from "../types/model-provider";
import { AppSettings, ServerSettings } from "../types/settings";
import logger from './logger';
import { AnthropicModelProvider } from './providers/anthropic-provider';

const settingsPath = path.join(process.cwd(), 'settings.json');

export class MCPClient {
  private provider: MCPModelProvider;
  private appSettings: AppSettings;
  private serverConnections: Map<string, ServerConnection> = new Map();
  private mcpTools: Tool[] = [];
  private context: QueryContext;

  constructor() {
    this.loadServerSettings();
    this.provider = new AnthropicModelProvider();
    this.resetContext();
    logger.info('MCPClient initialized');
  }

  private loadServerSettings(): void {
    try {
      this.appSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as AppSettings;
      logger.info('Server settings loaded');
    } catch (error) {
      logger.error('Failed to load server settings', { error });
      logger.warn('Creating default server settings file');
      this.appSettings = {
        modelProvider: {
          apiKey: ''
        },
        mcpServers: {}
      };

      try {
        fs.writeFileSync(settingsPath, JSON.stringify(this.appSettings, null, 2));
        logger.info('Created default server settings');
      } catch (writeError) {
        logger.error('Failed to create default server settings file', { error: writeError });
      }
    }
  }

  private async connectToServer(serverName: string, config: ServerSettings): Promise<string[]> {
    logger.info(`Connecting to server ${serverName}...`);

    try {
      if (config.env?.MEMORY_FILE_PATH) {
        const memoryDir = path.dirname(config.env.MEMORY_FILE_PATH);
        if (!fs.existsSync(memoryDir)) {
          fs.mkdirSync(memoryDir, { recursive: true });
          logger.info(`Created memory directory: ${memoryDir}`);
        }
      }

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env
      });

      const client = new Client({
        name: `mcp-client-${serverName}`,
        version: version
      });

      const connection: ServerConnection = {
        name: serverName,
        transport,
        client,
        tools: []
      };

      logger.info(`Initializing connection to ${serverName}`);
      connection.client.connect(transport);

      const toolsResult = await connection.client.listTools();
      connection.tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));

      this.serverConnections.set(serverName, connection);
      logger.info(`Connected to ${serverName} with ${connection.tools.length} tools`);

      return connection.tools.map(tool => tool.name);
    } catch (error) {
      logger.error(`Failed to connect to server ${serverName}`, { error });
      this.serverConnections.delete(serverName);
      throw error;
    }
  }

  private async updateMCPTools(): Promise<void> {
    this.mcpTools = [];
    for (const connection of this.serverConnections.values()) {
      this.mcpTools.push(...connection.tools);
    }
    // ModelProvider에 MCP 도구들 전달
    await this.provider.setTools(this.mcpTools);
  }

  async initialize(): Promise<Array<{ name: string; tools: string[] }>> {
    logger.info('Initializing MCP client...');

    try {
      const results: Array<{ name: string; tools: string[] }> = [];

      // MCP 서버 연결
      for (const [serverName, config] of Object.entries(this.appSettings.mcpServers)) {
        try {
          const tools = await this.connectToServer(serverName, config);
          results.push({ name: serverName, tools });
        } catch (error) {
          logger.error(`Failed to connect to server ${serverName}`, { error });
        }
      }

      // MCP 도구들 업데이트
      await this.updateMCPTools();

      // 모델 제공자 초기화
      await this.provider.initialize(this.appSettings.modelProvider.apiKey);

      logger.info('MCP client initialized successfully');
      return results;
    } catch (error) {
      logger.error('Failed to initialize MCP client', { error });
      throw error;
    }
  }

  getAvailableModels() {
    return this.provider.getAvailableModels();
  }

  setModel(modelId: string): void {
    this.provider.setModel(modelId);
  }

  getCurrentModel(): string | null {
    return this.provider.getCurrentModel();
  }

  getAvailableServers(): string[] {
    return Array.from(this.serverConnections.keys());
  }

  getServerTools(serverName: string): string[] | null {
    return this.serverConnections.get(serverName)?.tools.map(t => t.name) || null;
  }

  getAllTools(): Tool[] {
    return this.mcpTools;
  }

  private async executeToolCall(name: string, args: any): Promise<any> {
    try {
      logger.info(`Executing tool ${name} with args: ${JSON.stringify(args)}`);
      const serverConnection = Array.from(this.serverConnections.values()).find(
        connection => connection.tools.some(tool => tool.name === name)
      );

      if (!serverConnection) {
        throw new Error(`No server found that provides tool: ${name}`);
      }

      const result = await serverConnection.client.callTool({
        name: name,
        arguments: args,
      });

      logger.info(`Tool ${name} executed successfully: ${JSON.stringify(result, null, 2)}`);
      return result;
    } catch (error) {
      logger.error(`Error executing tool ${name}`, { error });
      throw error;
    }
  }

  private resetContext(options?: QueryOptions) {
    this.context = {
      messages: [],
      options: options || {
        temperature: 0.7,
        maxTokens: 2000
      }
    };
  }

  async *startQuery(query: string): AsyncGenerator<QueryResponse> {
    // this.resetContext(options);
    this.context.messages.push({ type: 'text', content: query });

    let continueQuery: boolean;
    do {
      logger.info('Starting query', { context: this.context });
      continueQuery = false;
      const stream = this.provider.startQuery(this.context);
      for await (const message of stream) {
        switch (message.type) {
          case 'text':
            yield message;
            break;
          case 'tool_use':
            logger.info('Tool use message received', { message });
            yield {
              type: 'tool_start',
              toolName: message.content.name,
              args: JSON.stringify(message.content.args, null, 2)
            };
            this.context.messages.push({
              type: 'tool_use',
              id: message.content.id,
              name: message.content.name,
              input: JSON.stringify(message.content.args, null, 2)
            });
            const toolResponse = await this.handleToolCall(message);
            continueQuery = toolResponse.type !== 'tool_error';
            yield toolResponse;
            break;
          default:
            break;
        }
      }
      logger.info('Query completed');
    } while (continueQuery);
  }

  async handleToolCall(toolUseResponse: ToolUseResponse): Promise<ToolResultQueryResponse | ToolErrorQueryResponse> {
    try {
      logger.info('Handling tool call', { toolUseResponse });
      const result = await this.executeToolCall(toolUseResponse.content.name, toolUseResponse.content.args);

      this.context.messages.push({
        type: 'tool_result',
        tool_use_id: toolUseResponse.content.id,
        content: result.content || 'No result'
      });

      logger.info('Tool result', { result });

      if (result.content.length == 1) {
        const content = result.content[0];
        switch (content.type) {
          case 'text':
            return {
              type: 'tool_result',
              toolName: toolUseResponse.content.name,
              result: content.text || 'No result'
            };
          default:
            return {
              type: 'tool_result',
              toolName: toolUseResponse.content.name,
              result: content || 'No result'
            };
        }
      }
      else {
        return {
          type: 'tool_result',
          toolName: toolUseResponse.content.name,
          result: result.content || 'No result'
        };
      }
    } catch (error) {
      return {
        type: 'tool_error',
        toolName: toolUseResponse.content.name,
        error: (error as Error).message || 'Unknown error'
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      // 모델 제공자 정리
      await this.provider.cleanup();

      // MCP 서버 연결 정리
      for (const connection of this.serverConnections.values()) {
        try {
          await connection.client.close();
          logger.info(`Closed connection to ${connection.name}`);
        } catch (error) {
          logger.error(`Error closing connection to ${connection.name}`, { error });
        }
      }
      this.serverConnections.clear();

      logger.info('MCP client cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup MCP client', { error });
      throw error;
    }
  }

  async stopQuery(): Promise<void> {
    try {
      await this.provider.stopQuery();
      logger.info('Stream stopped successfully');
    } catch (error) {
      logger.error('Failed to stop stream', { error });
      throw error;
    }
  }
}