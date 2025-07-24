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
      // Convert string to array if needed, but do not throw on error
      if (typeof params === 'string') {
        try {
          const parsed = JSON.parse(params);
          if (Array.isArray(parsed)) {
            params = parsed;
          } else {
            params = [];
          }
        } catch {
          params = [];
        }
      }

      const result = await this.dataSource.query(sql, params);
      return { rows: result };
    } catch (error) {
      console.error('❌ Error executing raw query:', error);
      throw error;
    }
  }
}
