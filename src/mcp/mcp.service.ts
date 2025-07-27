import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { queryExecutorJSON, subJSON, sumJSON } from '../tools/tools.schema.js';
import { ToolsService } from '../tools/tools.service.js';

@Injectable()
export class McpService {
  constructor(
    private readonly httpService: HttpService,
    private readonly toolsService: ToolsService,
  ) {}

  async queryLLM(prompt: string, retryCount = 0): Promise<any> {
    const tools = this.getTools();

    try {
      const response = await this.sendPromptToLLM(prompt, tools);
      const data = response.data;

      let res = new Map<string, any>();

      if (data.message?.tool_calls?.length) {
        for (const toolCall of data.message.tool_calls) {
          try {
            if (toolCall.function.name === 'sum') {
              const { a, b } = toolCall.function.arguments;
              const resultResponse = this.toolsService.sum({ a, b });
              res.set('sum', resultResponse);
            }

            if (toolCall.function.name === 'sub') {
              const { a, b } = toolCall.function.arguments;
              const resultResponse = this.toolsService.sub({ a, b });
              res.set('sub', resultResponse);
            }

            if (toolCall.function.name === 'executeRawQuery') {
              const { sql, params } = toolCall.function.arguments;
              const resultResponse = await this.toolsService.executeRawQuery(
                sql,
                params,
              );
              res.set('Query Result', resultResponse);
            }
          } catch (toolError) {
            console.warn(
              `❗ Tool execution failed for ${toolCall.function.name}:`,
              toolError.message || toolError,
            );

            if (retryCount < 5) {
              // Retry by calling queryLLM again with the error context
              const retryPrompt = `An error occurred while executing the tool "${toolCall.function.name}": ${toolError.message || toolError}. Please try again or suggest an alternative.`;
              return this.queryLLM(
                `${retryPrompt}. Original Prompt: ${prompt}`,
              );
            } else {
              return {
                response: `Failed after retrying tool "${toolCall.function.name}".`,
                error: toolError.message || toolError.toString(),
              };
            }
          }
        }

        return Object.fromEntries(res);
      }

      return {
        response: data.message?.content || 'No response from LLM',
      };
    } catch (error) {
      console.error('Error querying LLM:', error);
      return {
        response: 'Failed to query LLM or execute tool',
        error: error.message || error.toString(),
      };
    }
  }

  private async sendPromptToLLM(
    prompt: string,
    tools: any[], // Adjust type as needed, e.g., ToolDescription[]
  ) {
    return await firstValueFrom(
      this.httpService.post('http://192.168.10.28:11434/api/chat', {
        model: 'llama3.1', // Ensure this model supports tool-calling
        messages: [{ role: 'user', content: prompt }],
        tools,
        stream: false, // Disable streaming for simpler handling
      }),
    );
  }

  private getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'sum',
          description: 'Calculates the sum of two numbers',
          parameters: sumJSON, // Make sure sumJSON is correctly defined JSON Schema
        },
      },
      {
        type: 'function',
        function: {
          name: 'sub',
          description: 'Calculates the sub of two numbers',
          parameters: subJSON, // Make sure sumJSON is correctly defined JSON Schema
        },
      },
      {
        type: 'function',
        function: {
          name: 'executeRawQuery',
          description: 'Executes a raw SQL query with parameters',
          parameters: queryExecutorJSON, // Make sure sumJSON is correctly defined JSON Schema
        },
      },
    ];
  }

  async sendTextToLLM(prompt: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://192.168.10.28:11434/api/chat', {
          model: 'llama3',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      );

      return response.data?.message?.content;
    } catch (error) {
      console.error('LLM Error:', error.message, error.response?.data); // Debug log
      throw new BadRequestException(
        `Failed to communicate with LLM: ${error.message}`,
      );
    }
  }
}
