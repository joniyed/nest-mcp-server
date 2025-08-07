import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ToolResponse } from '../interfaces/tool-response.interface.js';

@Injectable()
export class ToolsService {
  constructor(private readonly dataSource: DataSource) {}

  // Simple text reply tool for basic interactions
  simpleReply(message: string): ToolResponse {
    const lowerMessage = message.toLowerCase().trim();
    let responseText: string;

    // Handle common greetings
    if (
      lowerMessage === 'hi' ||
      lowerMessage === 'hello' ||
      lowerMessage === 'hey'
    ) {
      responseText = 'Hello! How can I help you today?';
    } else if (lowerMessage === 'goodbye' || lowerMessage === 'bye') {
      responseText = 'Goodbye! Have a great day!';
    } else if (lowerMessage === 'thank you' || lowerMessage === 'thanks') {
      responseText = "You're welcome!";
    } else if (
      lowerMessage === 'how are you' ||
      lowerMessage === 'how are you?'
    ) {
      responseText = "I'm doing well, thank you for asking!";
    } else {
      // Default response for other messages
      responseText = `I received your message: "${message}". How can I assist you further?`;
    }

    return {
      success: true,
      data: {
        result: responseText,
        details: { originalMessage: message },
      },
      message: 'Simple reply generated successfully',
      toolName: 'simple_reply',
      timestamp: new Date().toISOString(),
    };
  }

  sum({ a, b }: { a: number; b: number }): ToolResponse {
    const result = Number(a) + Number(b);
    return {
      success: true,
      data: {
        result: result,
        details: { operands: { a, b }, operation: 'addition' },
      },
      message: `Successfully calculated sum of ${a} and ${b}`,
      toolName: 'sum',
      timestamp: new Date().toISOString(),
    };
  }

  sub({ a, b }: { a: number; b: number }): ToolResponse {
    const result = Number(a) - Number(b);
    return {
      success: true,
      data: {
        result: result,
        details: { operands: { a, b }, operation: 'subtraction' },
      },
      message: `Successfully calculated difference of ${a} and ${b}`,
      toolName: 'sub',
      timestamp: new Date().toISOString(),
    };
  }

  async executeRawQuery(sql: string, params: any = []): Promise<ToolResponse> {
    try {
      // Parse if params is a JSON string
      if (typeof params === 'string') {
        try {
          const parsed = JSON.parse(params);
          params = Array.isArray(parsed) ? parsed : [];
        } catch {
          params = [];
        }
      }

      // Filter out null or undefined values
      if (Array.isArray(params)) {
        params = params.filter((item) => item !== null && item !== undefined).map((item) => item.trim());
      } else {
        params = [];
      }

      // Check if query contains any parameter placeholders (e.g., $1, $2, etc.)
      const hasPlaceholders = /\$\d+|\?/.test(sql);

      // If no placeholders, ignore parameters
      if (!hasPlaceholders) {
        params = [];
      }

      let index = 0;
      const converted = sql.replace(/\?/g, () => `$${++index}`);

      const result = await this.dataSource.query(converted, params);

      return {
        success: true,
        data: {
          result: result,
          details: {
            rowCount: Array.isArray(result) ? result.length : 1,
            query: sql,
            parameters: params,
          },
        },
        message: `Query executed successfully. Returned ${Array.isArray(result) ? result.length : 1} row(s)`,
        toolName: 'executeRawQuery',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error executing raw query:', error);
      return {
        success: false,
        data: {
          result: null,
          details: { query: sql, parameters: params },
        },
        message: 'Failed to execute query',
        toolName: 'executeRawQuery',
        timestamp: new Date().toISOString(),
        error: error.message || 'Unknown database error',
      };
    }
  }
}
