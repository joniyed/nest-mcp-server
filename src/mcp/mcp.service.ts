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

  async queryLLM(prompt: string) {
    const tools = [
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

    try {
      // Send prompt to Ollama with tool descriptions
      const response = await firstValueFrom(
        this.httpService.post('http://192.168.68.135:11434/api/chat', {
          model: 'llama3.1', // Ensure this model supports tool-calling
          messages: [{ role: 'user', content: prompt }],
          tools,
          stream: false, // Disable streaming for simpler handling
        }),
      );

      const data = response.data;

      // Check if the LLM called a tool
      let res: string = '';
      if (data.message?.tool_calls?.length) {
        for (const toolCall of data.message.tool_calls) {
          if (toolCall.function.name === 'sum') {
            const { a, b } = toolCall.function.arguments;

            // Call your sum tool endpoint with arguments
            const resultResponse = this.toolsService.sum({ a, b });

            res += resultResponse;
          }
          if (toolCall.function.name === 'sub') {
            const { a, b } = toolCall.function.arguments;

            // Call your sum tool endpoint with arguments
            const resultResponse = this.toolsService.sub({ a, b });

            res += resultResponse;
          }

          if (toolCall.function.name === 'executeRawQuery') {
            const { sql, params } = toolCall.function.arguments;

            // Call your sum tool endpoint with arguments
            return await this.toolsService.executeRawQuery(sql, params);
          }
        }
        return res;
      }

      // If no tool call, return the LLM's text response
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

  async sendTextToLLM(prompt: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://192.168.68.135:11434/api/chat', {
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
