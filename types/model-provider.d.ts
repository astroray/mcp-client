import { QueryContext, StreamResponse } from "./index";

export interface MCPModel {
    id: string;
    name: string;
    description: string;
}

export interface MCPModelProvider {
    initialize(apiKey: string): Promise<string[]>;
    getAvailableModels(): MCPModel[];
    setModel(modelId: string): void;
    getCurrentModel(): string | null;
    getTools(): any[];
    setTools(tools: any[]): Promise<void>;
    startQuery(context: QueryContext): AsyncGenerator<StreamResponse>;
    stopQuery(): void;
    cleanup(): Promise<void>;
} 