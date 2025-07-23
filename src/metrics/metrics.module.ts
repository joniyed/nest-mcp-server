import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service.js';
import { MetricsController } from './metrics.controller.js';
import { Email } from '../entities/email.entity.js';
import { RuleTemplate } from '../entities/rule_template.entity.js';
import { Job } from '../entities/job.entity.js';
import { RuleDetail } from '../entities/rule_detail.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Email, Job, RuleTemplate, RuleDetail])],
  providers: [MetricsService],
  controllers: [MetricsController],
})
export class MetricsModule {}
