import { Body, Controller, Post } from '@nestjs/common';
import { ToolsService } from './tools.service.js';

@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post('sum')
  sum(@Body() body: { a: number; b: number }) {
    return { result: this.toolsService.sum(body) };
  }

  @Post('sub')
  sub(@Body() body: { a: number; b: number }) {
    return { result: this.toolsService.sub(body) };
  }
}
