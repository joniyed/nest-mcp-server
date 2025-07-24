import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service.js';
import { ToolsController } from './tools.controller.js';

@Module({
  providers: [ToolsService],
  controllers: [ToolsController],
  exports: [ToolsService],
})
export class ToolsModule {
}