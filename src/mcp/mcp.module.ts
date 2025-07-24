import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { McpService } from './mcp.service.js';
import { McpController } from './mcp.controller.js';
import { ToolsModule } from '../tools/tools.module.js';

@Module({
  imports: [HttpModule, ToolsModule],
  providers: [McpService],
  controllers: [McpController],
})
export class McpModule {
}