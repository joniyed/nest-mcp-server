import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { McpService } from './mcp.service.js';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {
  }

  @Post('query')
  async query(@Body() body: { prompt: string }) {
    if (!body.prompt) {
      throw new BadRequestException('Prompt is required');
    }
    const newVar = await this.mcpService.queryLLM(body.prompt);
    return newVar;
  }

  @Post()
  async sendText(@Body() body: { prompt: string }) {
    if (!body.prompt) {
      throw new BadRequestException('Prompt is required');
    }

    return await this.mcpService.sendTextToLLM(body.prompt);
  }

}