import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ToolsService {
  constructor(private readonly dataSource: DataSource) {} // Replace 'any' with your actual DataSource type

  sum({ a, b }: { a: number; b: number }): number {
    return a + b;
  }

  sub({ a, b }: { a: number; b: number }): number {
    return a - b;
  }

  async executeRawQuery(sql: string, params: any = []): Promise<any> {
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
        params = params.filter((item) => item !== null && item !== undefined);
      } else {
        params = [];
      }

      // Check if query contains any parameter placeholders (e.g., $1, $2, etc.)
      const hasPlaceholders = /\$\d+/.test(sql);

      // If no placeholders, ignore parameters
      if (!hasPlaceholders) {
        params = [];
      }

      const result = await this.dataSource.query(sql, params);
      return { rows: result };
    } catch (error) {
      console.error('❌ Error executing raw query:', error);
      throw error;
    }
  }

}
