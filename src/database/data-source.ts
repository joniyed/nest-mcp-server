import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Email } from '../entities/email.entity.js';
import { RuleTemplate } from '../entities/rule_template.entity.js';
import { Job } from '../entities/job.entity.js';
import { RuleDetail } from '../entities/rule_detail.entity.js';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Email, Job, RuleTemplate, RuleDetail],
  synchronize: true, // Set to false in production
});
