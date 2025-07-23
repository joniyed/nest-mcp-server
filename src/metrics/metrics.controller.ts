import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service.js';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  @Get('emails/count')
  async countEmails() {
    const count = await this.service.countEmails();
    return { count };
  }

  @Get('emails/unique/count')
  async countUniqueEmails() {
    const count = await this.service.countUniqueEmails();
    return { count };
  }

  @Get('rule-templates/count')
  async countRuleTemplates() {
    const count = await this.service.countRuleTemplates();
    return { count };
  }

  @Get('jobs/count')
  async countJobs() {
    const count = await this.service.countJobs();
    return { count };
  }

  @Get('rule-details/count')
  async countRuleDetails() {
    const count = await this.service.countRuleDetails();
    return { count };
  }
}