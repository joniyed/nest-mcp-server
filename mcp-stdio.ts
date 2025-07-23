import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Removed problematic imports for TextContent and ToolResponse from SDK

// Local type definitions for TextContent and ToolResponse
type TextContent = {
  type: 'text';
  text: string;
};

type ToolResponse = {
  content: TextContent[];
  isError?: boolean;
  // structuredContent?: unknown; // Add if you need to return structured JSON
  // _meta?: unknown; // Add if you need to return metadata
};

import fetch from 'node-fetch'; // node-fetch now correctly imported as ESM

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  const NEST_PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  console.error('⚙️ PORT from env:', process.env.PORT);

  const mcp = new McpServer({ name: 'Toppan MCP Server', version: '1.0.0' });

  const fetchMetric = async (path: string, description: string): Promise<ToolResponse> => {
    try {
      const res = await fetch(`http://localhost:${NEST_PORT}${path}`);
      if (!res.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching ${description}: Server responded with status ${res.status} - ${res.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = (await res.json()) as { count: number };
      return {
        content: [{ type: 'text', text: `Total ${description}: ${data.count}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Failed to connect to NestJS server for ${description}: ${error.message}` }],
        isError: true,
      };
    }
  };

  mcp.registerTool('countEmails', {}, () => fetchMetric('/metrics/emails/count', 'emails'));
  mcp.registerTool('countUniqueEmails', {}, () => fetchMetric('/metrics/emails/unique/count', 'unique emails'));
  mcp.registerTool('countRuleTemplates', {}, () => fetchMetric('/metrics/rule-templates/count', 'rule templates'));
  mcp.registerTool('countJobs', {}, () => fetchMetric('/metrics/jobs/count', 'jobs'));
  mcp.registerTool('countRuleDetails', {}, () => fetchMetric('/metrics/rule-details/count', 'rule details'));
  

  const transport = new StdioServerTransport();

// 🛠 Start NestJS and MCP in parallel
await Promise.all([
  app.listen(NEST_PORT).then(() => {
    console.error('NestJS application listening on port', NEST_PORT);
  }),
  (async () => {
    console.error('🧰 Registered tools:', [
      'countEmails',
      'countUniqueEmails',
      'countRuleTemplates',
      'countJobs',
      'countRuleDetails'
    ]);
    await mcp.connect(transport);
  })(),
]);
}


bootstrap();