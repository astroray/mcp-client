import { Anthropic } from '@anthropic-ai/sdk';
import { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import { QueryContext, StreamResponse, TextResponse, ToolUseResponse } from '../../types/index';
import { MCPModel, MCPModelProvider } from '../../types/model-provider';
import logger from '../logger';

enum MessageEventType {
    MESSAGE_START = 'message_start',
    CONTENT_BLOCK_START = 'content_block_start',
    CONTENT_BLOCK_DELTA = 'content_block_delta',
    CONTENT_BLOCK_STOP = 'content_block_stop',
    MESSAGE_DELTA = 'message_delta',
    MESSAGE_STOP = 'message_stop',
}

export class AnthropicModelProvider implements MCPModelProvider {
    private client: Anthropic;
    private currentModel: string | null = null;
    private availableModels: MCPModel[] = [];
    private tools: Tool[] = [];
    private abortController: AbortController | null = null;

    async initialize(apiKey: string): Promise<string[]> {
        try {
            this.client = new Anthropic({
                apiKey: apiKey
            });

            const models = await this.client.models.list();
            this.availableModels = models.data.map(model => ({
                id: model.id,
                name: model.display_name,
                description: `Anthropic ${model.display_name} model`
            }));

            // Set Claude 3 Haiku as default model if available
            const defaultModel = this.availableModels.find(model => model.name === 'Claude 3.5 Haiku');
            if (defaultModel) {
                this.currentModel = defaultModel.id;
                logger.info(`Set default model to ${defaultModel.name} (${defaultModel.id})`);
            } else if (this.availableModels.length > 0) {
                this.currentModel = this.availableModels[0].id;
                logger.info(`Fallback: Set default model to ${this.availableModels[0].name} (${this.availableModels[0].id})`);
            }

            return this.availableModels.map(model => model.id);
        } catch (error) {
            logger.error('Error initializing models:', error);
            throw error;
        }
    }

    getAvailableModels(): MCPModel[] {
        return this.availableModels;
    }

    setModel(modelId: string): void {
        if (this.availableModels.some(model => model.id === modelId)) {
            this.currentModel = modelId;
            logger.info(`Model set to ${modelId}`);
        } else {
            throw new Error(`Model ${modelId} not found`);
        }
    }

    getCurrentModel(): string | null {
        return this.currentModel;
    }

    getTools(): Tool[] {
        return [...this.tools];  // 도구 목록의 복사본을 반환하여 직접 수정 방지
    }

    async setTools(tools: Tool[]): Promise<void> {
        try {
            // 도구 유효성 검사
            if (!Array.isArray(tools)) {
                throw new Error('Tools must be an array');
            }

            // 도구 목록 업데이트
            this.tools = [...tools];  // 복사본 저장

            logger.info(`Tools updated successfully. Total tools: ${tools.length}`);
        } catch (error) {
            logger.error('Error setting tools:', error);
            throw error;
        }
    }

    isQueryRunning(): boolean {
        return this.abortController !== null && !this.abortController.signal.aborted;
    }

    // 스트림 처리 중단 메서드 추가 
    stopQuery() {
        if (this.abortController) {
            logger.info('Stopping message stream');
            this.abortController.abort();
            this.abortController = null;
        }
    }

    async *startQuery(context: QueryContext): AsyncGenerator<StreamResponse> {
        if (this.isQueryRunning()) {
            logger.info('Stopping message stream due to new query');
            this.stopQuery();
        }
        this.abortController = new AbortController();

        try {
            if (!this.currentModel) {
                throw new Error('No model selected');
            }

            const abortController = this.abortController;
            if (!abortController) {
                throw new Error('AbortController is not initialized');
            }

            let responses: StreamResponse[] = [];

            const messages: Array<MessageParam> = context.messages.map(message => {
                try {
                    logger.debug('Creating message', { message });
                    switch (message.type) {
                        case 'text':
                            return {
                                role: 'user',
                                content: message.content
                            }
                        case 'tool_use':
                            return {
                                role: 'assistant',
                                content: [{
                                    type: "tool_use",
                                    id: message.id,
                                    name: message.name,
                                    input: message.input ? JSON.parse(message.input) : {}
                                }]
                            }
                        case 'tool_result':
                            return {
                                role: 'user',
                                content: [{
                                    type: "tool_result",
                                    tool_use_id: message.tool_use_id,
                                    content: message.content
                                }]
                            }
                        default:
                            logger.error('Invalid message type', { message });
                            throw new Error('Invalid message type');
                    }
                } catch (error) {
                    logger.error('Error creating message', { error });
                    throw error;
                }
            });

            logger.debug('Query messages:', { messages });

            const messageStream = await this.client.messages.stream({
                model: this.currentModel,
                messages: messages,
                max_tokens: context.options?.maxTokens || 2000,
                temperature: context.options?.temperature || 0.7,
                tools: this.tools
            }, {
                signal: abortController.signal
            });

            let toolUseCount = 0;
            for await (const event of messageStream) {
                switch (event.type) {
                    case MessageEventType.MESSAGE_START:
                        logger.debug('Message started');
                        break;

                    case MessageEventType.CONTENT_BLOCK_START:
                        logger.debug('Content block started');
                        switch (event.content_block.type) {
                            case 'text':
                                responses.push({ type: 'text', content: '' });
                                break;
                            case 'tool_use':
                                logger.debug(`Tool use content block started: ${event.content_block.name}`);
                                responses.push({
                                    type: 'tool_use',
                                    content: {
                                        id: event.content_block.id,
                                        name: event.content_block.name, args: {}
                                    },
                                    inputString: ''
                                });
                                ++toolUseCount;
                                break;
                            default:
                                break;
                        }
                        break;

                    case MessageEventType.CONTENT_BLOCK_DELTA:
                        logger.debug('Content block delta received');

                        switch (event.delta.type) {
                            case 'text_delta':
                                {
                                    const current = responses[responses.length - 1] as TextResponse;
                                    current.content += event.delta.text;
                                    yield current;
                                }
                                break;
                            case 'input_json_delta':
                                {
                                    const current = responses[responses.length - 1] as ToolUseResponse;
                                    current.inputString += event.delta.partial_json;
                                }
                                break;
                        }
                        break;

                    case MessageEventType.CONTENT_BLOCK_STOP:
                        logger.debug('Content block stopped');
                        break;

                    case MessageEventType.MESSAGE_DELTA:
                        logger.debug('Message delta received', { delta: event.delta });
                        switch (event.delta.stop_reason) {
                            case 'tool_use':
                                {
                                    for (let i = responses.length - toolUseCount; i < responses.length; i++) {
                                        const current = responses[i] as ToolUseResponse;
                                        current.content.args = current.inputString ? JSON.parse(current.inputString) : undefined;
                                        yield current;
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                        break;

                    case MessageEventType.MESSAGE_STOP:
                        logger.debug('Message completed');
                        break;
                }
            }
        } catch (error) {
            logger.error(`Stream processing error: ${JSON.stringify(error, null, 2)}`);
            yield {
                type: 'error',
                content: '\n[Error: Stream processing failed]\n'
            };
        } finally {
            this.abortController?.abort();
            this.abortController = null;
        }
    }

    async cleanup(): Promise<void> {
        // 진행 중인 스트림이 있다면 중단
        this.stopQuery();
    }
} 