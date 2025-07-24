import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsModule } from './metrics/metrics.module.js';
import { ConfigModule } from '@nestjs/config';
import { McpModule } from './mcp/mcp.module.js';
import { ToolsModule } from './tools/tools.module.js';
import { databaseConfig } from './configs/database.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(databaseConfig), // Use your database config here
    MetricsModule,
    ToolsModule,
    McpModule,
  ],
})
export class AppModule {}
