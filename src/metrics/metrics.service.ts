import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Email } from '../entities/email.entity.js';
import { RuleTemplate } from '../entities/rule_template.entity.js';
import { Job } from '../entities/job.entity.js';
import { RuleDetail } from '../entities/rule_detail.entity.js';

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(Email) private emailRepo: Repository<Email>,
    @InjectRepository(RuleTemplate) private ruleTemplateRepo: Repository<RuleTemplate>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(RuleDetail) private ruleDetailRepo: Repository<RuleDetail>,
  ) {}

  countEmails(): Promise<number> {
    return this.emailRepo.count();
  }

  async countUniqueEmails(): Promise<number> {
    const uniqueEmailCount = await this.emailRepo
      .createQueryBuilder('email')
      .select('COUNT(DISTINCT email.address)', 'count')
      .getRawOne(); // Use getRawOne() to get the raw result from the query builder

    return parseInt(uniqueEmailCount.count, 10);
  }

  countRuleTemplates(): Promise<number> {
    return this.ruleTemplateRepo.count();
  }

  countJobs(): Promise<number> {
    return this.jobRepo.count();
  }

  countRuleDetails(): Promise<number> {
    return this.ruleDetailRepo.count();
  }
}