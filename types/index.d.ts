import { Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface TextQueryParam {
    type: 'text';
    content: string;
}

export interface ToolUseQueryParam {
    type: 'tool_use';
    id: string;
    name: string;
    input: string;
}

export interface ToolResultQueryParam {
    type: 'tool_result';
    tool_use_id: string;
    content: string;
}

export type QueryMessage = TextQueryParam | ToolUseQueryParam | ToolResultQueryParam;

export interface QueryOptions {
    temperature?: number;
    maxTokens?: number;
}

export interface QueryContext {
    messages: QueryMessage[];
    options?: QueryOptions;
}

export interface ServerConnection {
    name: string;
    transport: StdioClientTransport;
    client: Client;
    tools: Tool[];
}

export interface TextResponse {
    type: 'text',
    content: string;
}

export interface ToolUseResponse {
    type: 'tool_use',
    content: {
        id: string;
        name: string;
        args: Record<string, unknown> | undefined;
    },
    inputString: string;
}

export interface ErrorReponse {
    type: 'error'
    content: string;
}

export type StreamResponse = TextResponse | ToolUseResponse | ErrorReponse;