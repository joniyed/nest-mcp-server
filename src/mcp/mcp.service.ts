import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { queryExecutorJSON, subJSON, sumJSON, simpleReplyJSON } from '../tools/tools.schema.js';
import { ToolsService } from '../tools/tools.service.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

@Injectable()
export class McpService {
  private server: Server;

  constructor(
    private readonly httpService: HttpService,
    private readonly toolsService: ToolsService,
  ) {
    this.server = new Server(
      {
        name: 'nest-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'simple_reply',
          description:
            'Provides simple text replies for basic interactions like greetings',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The message to respond to',
              },
            },
            required: ['message'],
          },
        },
        {
          name: 'sum',
          description: 'Add two numbers',
          inputSchema: {
            type: 'object',
            properties: {
              a: { type: 'number', description: 'First number' },
              b: { type: 'number', description: 'Second number' },
            },
            required: ['a', 'b'],
          },
        },
        {
          name: 'sub',
          description: 'Subtract two numbers',
          inputSchema: {
            type: 'object',
            properties: {
              a: { type: 'number', description: 'First number' },
              b: { type: 'number', description: 'Second number' },
            },
            required: ['a', 'b'],
          },
        },
        {
          name: 'execute_raw_query',
          description: 'Execute a raw SQL query against the database',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'SQL query to execute' },
              params: {
                type: 'array',
                description: 'Query parameters',
                items: { type: 'any' },
              },
            },
            required: ['sql'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (!args) {
          throw new Error('No arguments provided');
        }

        let toolResponse;

        switch (name) {
          case 'simple_reply':
            toolResponse = this.toolsService.simpleReply(args.message as string);
            break;

          case 'sum':
            toolResponse = this.toolsService.sum({
              a: args.a as number,
              b: args.b as number
            });
            break;

          case 'sub':
            toolResponse = this.toolsService.sub({
              a: args.a as number,
              b: args.b as number
            });
            break;

          case 'execute_raw_query':
            toolResponse = await this.toolsService.executeRawQuery(
              args.sql as string,
              args.params as any[],
            );
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        // Return standardized response format
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(toolResponse, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                data: null,
                message: 'Tool execution failed',
                toolName: name,
                timestamp: new Date().toISOString(),
                error: error.message,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🚀 MCP Server started');
  }

  getServer() {
    return this.server;
  }

  async queryLLM(prompt: string, retryCount = 0): Promise<any> {
    const tools = this.getTools();

    try {
      const response = await this.sendPromptToLLM(prompt, tools);
      const data = response.data;
      console.log('LLM Response: ' + JSON.stringify(data.message));

      if (data.message?.tool_calls?.length) {
        // Get the first tool call (assuming single tool execution)
        const toolCall = data.message.tool_calls[0];

        try {
          let toolResponse;

          if (toolCall.function.name === 'simple_reply') {
            const { message } = toolCall.function.arguments;
            toolResponse = this.toolsService.simpleReply(message);
          } else if (toolCall.function.name === 'sum') {
            const { a, b } = toolCall.function.arguments;
            toolResponse = this.toolsService.sum({ a, b });
          } else if (toolCall.function.name === 'sub') {
            const { a, b } = toolCall.function.arguments;
            toolResponse = this.toolsService.sub({ a, b });
          } else if (toolCall.function.name === 'executeRawQuery') {
            const { sql, params } = toolCall.function.arguments;
            toolResponse = await this.toolsService.executeRawQuery(sql, params);
          }

          // Return the direct tool response without wrapper
          return toolResponse;

        } catch (toolError) {
          console.warn(
            `❗ Tool execution failed for ${toolCall.function.name}:`,
            toolError.message || toolError,
          );

          if (retryCount < 10) {
            const retryPrompt = `An error occurred while executing the tool "${toolCall.function.name}": ${toolError.message || toolError}. Please try again or suggest an alternative.`;
            return this.queryLLM(`${retryPrompt}. Original Prompt: ${prompt}`);
          } else {
            return {
              success: false,
              data: {
                result: null,
                details: { originalPrompt: prompt }
              },
              message: `Failed after retrying tool "${toolCall.function.name}"`,
              toolName: toolCall.function.name,
              timestamp: new Date().toISOString(),
              error: toolError.message || toolError.toString(),
            };
          }
        }
      }

      return {
        success: true,
        data: {
          result: data.message?.content || 'No response from LLM',
          details: { prompt }
        },
        message: 'Direct LLM response',
        toolName: 'llm_response',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error querying LLM:', error);
      return {
        success: false,
        data: {
          result: null,
          details: { prompt }
        },
        message: 'Failed to query LLM',
        toolName: 'llm_query',
        timestamp: new Date().toISOString(),
        error: error.message || error.toString(),
      };
    }
  }

  private async sendPromptToLLM(
    prompt: string,
    tools: any[], // Adjust type as needed, e.g., ToolDescription[]
  ) {
    return await firstValueFrom(
      this.httpService.post('http://192.168.10.28:11434/api/chat', {
        // model: 'gpt-oss:120b', // Ensure this model supports tool-calling
        model: 'llama3.1', // Ensure this model supports tool-calling
        messages: [
          {
            role: 'system',
            // In McpService, sendPromptToLLM method, within the system role content:
            content:
              'Context:\n' +
              'You are an expert PostgreSQL query generator. Your task is to translate user requests into precise and efficient SQL queries using the provided database schema. Always prioritize selecting relevant columns, applying correct JOIN operations, and filtering data accurately based on the user\'s intent. Pay close attention to data types and potential case sensitivity for string comparisons.\n' +
              '\n' +
              'Postgres Tables:\n' +
              'additional, additional_cost_summary_rules, ai_model_version_change_history, ai_model_versions, ai_models, billable_items, client_view, conditions, cost_summary_rule_tasks, cost_summary_rules, email, email_file_change_details, email_files, email_job_mappers, email_replies, email_tags, emails, external_cost_summaries, internal_views, job, job_activity, job_activity_logs, job_rule_conditions, job_rules, jobs, order_cost_summary_rules, others, package_cost_summary_rules, packages, plans, pricing, roles, rule_detail, rule_details, rule_template, rule_templates, sub_task_types, task_types, tasks, tcc_attachments, tcc_job_sales_persons, tcc_languages, tcc_master_data, tcc_projects, tcc_sync_details, tcc_task_attachments, tcc_translation_tasks, tcc_type_settings_tasks, tcc_users, user_requests, user_roles, users\n' +
              '\n' +
              'PostgreSQL Database Schema Details:\n' +
              '-- Table: emails (Core email details)\n' +
              '-- Columns: id BIGINT (PK), email_id CHARACTER VARYING(512) (Unique), storage_key TEXT, subject CHARACTER VARYING(512), sender CHARACTER VARYING(512), email CHARACTER VARYING(512), no_of_replies INTEGER, current_status CHARACTER VARYING(64), last_email_time BIGINT, project_name TEXT, project_id TEXT, created_at BIGINT, updated_at BIGINT\n' +
              '\n' +
              '-- Table: email_file_change_details (Records changes to email attachments)\n' +
              '-- Columns: id BIGINT (PK), change_content TEXT, change_types CHARACTER VARYING(255), change_page_no INTEGER, created_at BIGINT, updated_at BIGINT, email_file_id BIGINT (FK to email_files.id)\n' +
              '\n' +
              '-- Table: email_files (Details of files attached to emails or replies)\n' +
              '-- Columns: id BIGINT (PK), file_name CHARACTER VARYING(5048), total_pages INTEGER, no_of_words INTEGER, total_changes INTEGER, change_details TEXT, created_at BIGINT, updated_at BIGINT, email_id BIGINT (FK to emails.id), email_reply_id BIGINT (FK to email_replies.id), current_status CHARACTER VARYING(64)\n' +
              '\n' +
              '-- Table: email_job_mappers (Links emails to jobs)\n' +
              '-- Columns: id BIGINT (PK), email_id BIGINT (FK to emails.id), job_id BIGINT (FK to jobs.id)\n' +
              '\n' +
              '-- Table: email_jobs (Direct email-job relationship)\n' +
              '-- Columns: email_id BIGINT (FK to emails.id), job_id BIGINT (FK to jobs.id)\n' +
              '\n' +
              '-- Table: email_replies (Details of replies to emails)\n' +
              '-- Columns: id BIGINT (PK), email_message_id CHARACTER VARYING(512) (Unique), subject TEXT, body TEXT, reply_by CHARACTER VARYING(255), key_instructions TEXT, reply_date BIGINT, attachments TEXT, overview_data JSON, created_at BIGINT, updated_at BIGINT, email_id BIGINT (FK to emails.id), current_status CHARACTER VARYING(64)\n' +
              '\n' +
              '-- Table: email_tags (Tags for emails)\n' +
              '-- Columns: id BIGINT (PK), name CHARACTER VARYING(255), created_at BIGINT, updated_at BIGINT\n' +
              '\n' +
              '-- Table: job-list (Summary of jobs with status and billing details)\n' +
              '-- Columns: id BIGINT (PK), project_name CHARACTER VARYING(100), project_id BIGINT, job_status CHARACTER VARYING(50), billing_status CHARACTER VARYING(50), sales CHARACTER VARYING(50), inactive_days CHARACTER VARYING(20), created_at_date BIGINT, created_at_time BIGINT\n' +
              '\n' +
              '-- Table: job_activity (Logs activities related to jobs and email replies)\n' +
              '-- Columns: id BIGINT (PK), category CHARACTER VARYING(50), source CHARACTER VARYING(100), details CHARACTER VARYING(255), created_at BIGINT, updated_at BIGINT, email_reply_id BIGINT (FK to email_replies.id), job_id BIGINT (FK to jobs.id)\n' +
              '\n' +
              '-- Table: job_activity_logs (Detailed logs of job activities)\n' +
              '-- Columns: id INTEGER (PK), date BIGINT, time BIGINT, category CHARACTER VARYING(100), details CHARACTER VARYING(500), source CHARACTER VARYING(100)\n' +
              '\n' +
              '-- Table: job_rule_conditions (Conditions for job rules)\n' +
              '-- Columns: id BIGINT (PK), key CHARACTER VARYING(50), value CHARACTER VARYING(255), operator CHARACTER VARYING(10), name CHARACTER VARYING(255), position INTEGER, created_at BIGINT, updated_at BIGINT, job_rule_id BIGINT (FK to job_rules.id, ON DELETE CASCADE), created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id)\n' +
              '\n' +
              '-- Table: job_rules (Defines rules for jobs, including billing and pricing)\n' +
              '-- Columns: id BIGINT (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), unit_price DOUBLE PRECISION, inclusive_qty DOUBLE PRECISION, waive_qty DOUBLE PRECISION, additional_qty DOUBLE PRECISION, created_at BIGINT, updated_at BIGINT, jobid BIGINT (FK to jobs.id), rule_details_id BIGINT (FK to rule_details.id)\n' +
              '\n' +
              '-- Table: jobs (Core job information with statuses and links)\n' +
              '-- Columns: id BIGINT (PK), billing_status CHARACTER VARYING(50), job_id CHARACTER VARYING (Unique), created_at BIGINT, updated_at BIGINT, created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id), job_identity INTEGER, project_identity INTEGER, invoice_status CHARACTER VARYING(50), creation_date BIGINT, modification_date BIGINT, discount DOUBLE PRECISION, total_package_price DOUBLE PRECISION, billing_handler BIGINT (FK to users.id), job_name TEXT, job_status TEXT, project_id TEXT, text TEXT, sales TEXT, inactive_days CHARACTER VARYING(100)\n' +
              '\n' +
              '-- Table: internal_view (Internal view of rule details/calculations)\n' +
              '-- Columns: id INTEGER (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), unit_price DOUBLE PRECISION, inclusive_qty DOUBLE PRECISION, waive_qty DOUBLE PRECISION, total_qty DOUBLE PRECISION, add_qty DOUBLE PRECISION, total_price DOUBLE PRECISION\n' +
              '\n' +
              '-- Table: internal_views (Another internal view for rule details)\n' +
              '-- Columns: id INTEGER (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), unit_price DOUBLE PRECISION, inclusive_qty DOUBLE PRECISION, waive_qty DOUBLE PRECISION, total_qty DOUBLE PRECISION, add_qty DOUBLE PRECISION, total_price DOUBLE PRECISION\n' +
              '\n' +
              '-- Table: external_cost_summaries (Summarizes costs from external sources)\n' +
              '-- Columns: id BIGINT (PK), job_id BIGINT (FK to jobs.id)\n' +
              '\n' +
              '-- Table: conditions (Defines various conditions for rules)\n' +
              '-- Columns: id BIGINT (PK), key CHARACTER VARYING(50), value CHARACTER VARYING(255), operator CHARACTER VARYING(10), name CHARACTER VARYING(255), position INTEGER, created_at BIGINT, updated_at BIGINT, rule_detail_id BIGINT (FK to rule_details.id), created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id)\n' +
              '\n' +
              '-- Table: billable_items (Defines items that can be billed)\n' +
              '-- Columns: id INTEGER (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), condition CHARACTER VARYING(100), unit_price DOUBLE PRECISION, inclusive_qty DOUBLE PRECISION, waive_qty DOUBLE PRECISION\n' +
              '\n' +
              '-- Table: rule_templates (Templates for rules)\n' +
              '-- Columns: id BIGINT (PK), name CHARACTER VARYING(100), product_type CHARACTER VARYING(50), version INTEGER, created_at BIGINT, updated_at BIGINT, plan_id BIGINT (FK to plans.id), created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id), job_id BIGINT (FK to jobs.id)\n' +
              '\n' +
              '-- Table: rule_details (Specific details for rules)\n' +
              '-- Columns: id BIGINT (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), created_at BIGINT, updated_at BIGINT, created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id), template_id BIGINT (FK to rule_templates.id)\n' +
              '\n' +
              '-- Table: plans (Defines various plans)\n' +
              '-- Columns: id BIGINT (PK), name CHARACTER VARYING(100), created_at BIGINT, updated_at BIGINT, created_by BIGINT (FK to users.id), updated_by BIGINT (FK to users.id)\n' +
              '\n' +
              '-- Table: tasks (Details of tasks, linked to jobs and email)\n' +
              '-- Columns: id BIGINT (PK), task_identity BIGINT, row_version CHARACTER VARYING(100), language CHARACTER VARYING(100), creation_date BIGINT, modified_date BIGINT, created_by BIGINT (FK to users.id), modified_by BIGINT (FK to users.id), task_type_id BIGINT (FK to task_types.id), status CHARACTER VARYING(100), task_id CHARACTER VARYING(255), expected_tat_datetime BIGINT, total_number_of_pages INTEGER, proof_read_by_id BIGINT (FK to users.id), email_id BIGINT (FK to emails.id), task_completion_date BIGINT, previous_status BIGINT, tera_task_id BIGINT, created_at BIGINT, updated_at BIGINT, sub_task_type_id BIGINT (FK to sub_task_types.id), job_id BIGINT (FK to jobs.id)\n' +
              '\n' +
              '-- Table: task_types (Defines different types of tasks)\n' +
              '-- Columns: id BIGINT (PK), task_type_id BIGINT, creation_date BIGINT, modified_date BIGINT, name CHARACTER VARYING(100), created_at BIGINT, updated_at BIGINT\n' +
              '\n' +
              '-- Table: sub_task_types (Defines sub-types for tasks)\n' +
              '-- Columns: id BIGINT (PK), sub_task_type_id BIGINT, name CHARACTER VARYING(100), creation_date BIGINT, modified_date BIGINT, created_at BIGINT, updated_at BIGINT\n' +
              '\n' +
              '-- Table: cost_summary_rule_tasks (Mapping between cost summaries and tasks)\n' +
              '-- Columns: cost_summary_rule_id BIGINT (FK to cost_summary_rules.id), task_id BIGINT (FK to tasks.id)\n' +
              '\n' +
              '-- Table: cost_summary_rules (Defines rules for cost summaries)\n' +
              '-- Columns: id BIGINT (PK), rule_name CHARACTER VARYING(100), category CHARACTER VARYING(100), billing_unit CHARACTER VARYING(50), unit_price DOUBLE PRECISION, inclusive_qty DOUBLE PRECISION, waive_qty DOUBLE PRECISION, additional_qty DOUBLE PRECISION, created_at BIGINT, updated_at BIGINT, rule_details_id BIGINT (FK to rule_details.id)\n' +
              '\n' +
              '-- Table: cost_summary_rules_task_list_tasks (Mapping for cost summary rules to tasks within a task list)\n' +
              '-- Columns: costSummaryRulesId BIGINT (FK to cost_summary_rules.id), tasksId BIGINT (FK to tasks.id)\n' +
              '\n' +
              '-- Table: cost_summary_rules_tasks_tasks (Another mapping for cost summary rules to tasks)\n' +
              '-- Columns: costSummaryRulesId BIGINT (FK to cost_summary_rules.id), tasksId BIGINT (FK to tasks.id)\n' +
              '\n' +
              '-- Table: order_cost_summary_rules (Mapping linking orders to cost summary rules)\n' +
              '-- Columns: othersId BIGINT, costSummaryRulesId BIGINT (FK to cost_summary_rules.id)\n' +
              '\n' +
              '-- Table: package_cost_summary_rules (Mapping linking packages to cost summary rules)\n' +
              '-- Columns: packagesId BIGINT (FK to packages.id), costSummaryRulesId BIGINT (FK to cost_summary_rules.id)\n' +
              '\n' +
              '-- Table: packages (Defines packages)\n' +
              '-- Columns: id BIGINT (PK), external_cost_summary_id BIGINT (FK to external_cost_summaries.id)\n' +
              '\n' +
              '-- Table: pricing (Stores pricing details)\n' +
              '-- Columns: id BIGINT (PK), package_price DOUBLE PRECISION, package_subtotal_price DOUBLE PRECISION, additional_subtotal_price DOUBLE PRECISION, discount DOUBLE PRECISION, total_price DOUBLE PRECISION, final_price DOUBLE PRECISION, external_cost_summary_id BIGINT (FK to external_cost_summaries.id)\n' +
              '\n' +
              '-- Table: tcc_attachments (Stores TCC attachments)\n' +
              '-- Columns: id BIGINT (PK), attachment_identity BIGINT, name TEXT\n' +
              '\n' +
              '-- Table: additional_cost_summary_rules (Mapping for additional costs to cost summary rules)\n' +
              '-- Columns: additionalId BIGINT, costSummaryRulesId BIGINT (FK to cost_summary_rules.id)\n' +
              '\n' +
              '-- Table: users (Users of the system)\n' +
              '-- Columns: id BIGINT (PK), name TEXT, email TEXT -- (Assumed from typical user tables and FKs)\n' +
              '\n' +
              '-- Table: ai_model_version_change_history (History of AI model version changes)\n' +
              '-- Columns: id BIGINT (PK), version_id BIGINT (FK to ai_model_versions.id), change_details TEXT, changed_at BIGINT\n' +
              '\n' +
              '-- Table: ai_model_versions (Versions of AI models)\n' +
              '-- Columns: id BIGINT (PK), model_id BIGINT (FK to ai_models.id), version_number CHARACTER VARYING(50), release_date BIGINT\n' +
              '\n' +
              '-- Table: ai_models (Details of AI models)\n' +
              '-- Columns: id BIGINT (PK), name CHARACTER VARYING(255), description TEXT\n' +
              '\n' +
              '-- Table: client_view (Client-specific view data)\n' +
              '-- Columns: id BIGINT (PK), client_id BIGINT, view_data JSON\n' +
              '\n' +
              '-- Table: roles (User roles)\n' +
              '-- Columns: id BIGINT (PK), role_name CHARACTER VARYING(100)\n' +
              '\n' +
              '-- Table: user_requests (User requests log)\n' +
              '-- Columns: id BIGINT (PK), user_id BIGINT (FK to users.id), request_type CHARACTER VARYING(100), request_details TEXT, requested_at BIGINT\n' +
              '\n' +
              '-- Table: user_roles (Mapping between users and roles)\n' +
              '-- Columns: user_id BIGINT (FK to users.id), role_id BIGINT (FK to roles.id)\n' +
              '\n' +
              '-----------------------------------------------------------\n' +
              '-- Table Relationships (Foreign Keys for JOIN operations):\n' +
              '-----------------------------------------------------------\n' +
              '-- email_file_change_details.email_file_id -> email_files.id\n' +
              '-- email_files.email_id -> emails.id\n' +
              '-- email_files.email_reply_id -> email_replies.id\n' +
              '-- email_job_mappers.email_id -> emails.id\n' +
              '-- email_job_mappers.job_id -> jobs.id\n' +
              '-- email_jobs.email_id -> emails.id\n' +
              '-- email_jobs.job_id -> jobs.id\n' +
              '-- email_replies.email_id -> emails.id\n' +
              '-- job_activity.email_reply_id -> email_replies.id\n' +
              '-- job_activity.job_id -> jobs.id\n' +
              '-- job_rule_conditions.job_rule_id -> job_rules.id\n' +
              '-- job_rule_conditions.created_by -> users.id\n' +
              '-- job_rule_conditions.updated_by -> users.id\n' +
              '-- job_rules.jobid -> jobs.id\n' +
              '-- job_rules.rule_details_id -> rule_details.id\n' +
              '-- jobs.created_by -> users.id\n' +
              '-- jobs.updated_by -> users.id\n' +
              '-- jobs.billing_handler -> users.id\n' +
              '-- external_cost_summaries.job_id -> jobs.id\n' +
              '-- conditions.rule_detail_id -> rule_details.id\n' +
              '-- conditions.created_by -> users.id\n' +
              '-- conditions.updated_by -> users.id\n' +
              '-- rule_templates.plan_id -> plans.id\n' +
              '-- rule_templates.created_by -> users.id\n' +
              '-- rule_templates.updated_by -> users.id\n' +
              '-- rule_templates.job_id -> jobs.id\n' +
              '-- rule_details.created_by -> users.id\n' +
              '-- rule_details.updated_by -> users.id\n' +
              '-- rule_details.template_id -> rule_templates.id\n' +
              '-- plans.created_by -> users.id\n' +
              '-- plans.updated_by -> users.id\n' +
              '-- tasks.created_by -> users.id\n' +
              '-- tasks.modified_by -> users.id\n' +
              '-- tasks.task_type_id -> task_types.id\n' +
              '-- tasks.proof_read_by_id -> users.id\n' +
              '-- tasks.email_id -> emails.id\n' +
              '-- tasks.sub_task_type_id -> sub_task_types.id\n' +
              '-- tasks.job_id -> jobs.id\n' +
              '-- cost_summary_rule_tasks.cost_summary_rule_id -> cost_summary_rules.id\n' +
              '-- cost_summary_rule_tasks.task_id -> tasks.id\n' +
              '-- cost_summary_rules.rule_details_id -> rule_details.id\n' +
              '-- cost_summary_rules_task_list_tasks.costSummaryRulesId -> cost_summary_rules.id\n' +
              '-- cost_summary_rules_task_list_tasks.tasksId -> tasks.id\n' +
              '-- cost_summary_rules_tasks_tasks.costSummaryRulesId -> cost_summary_rules.id\n' +
              '-- cost_summary_rules_tasks_tasks.tasksId -> tasks.id\n' +
              '-- order_cost_summary_rules.costSummaryRulesId -> cost_summary_rules.id\n' +
              '-- package_cost_summary_rules.packagesId -> packages.id\n' +
              '-- package_cost_summary_rules.costSummaryRulesId -> cost_summary_rules.id\n' +
              '-- packages.external_cost_summary_id -> external_cost_summaries.id\n' +
              '-- pricing.external_cost_summary_id -> external_cost_summaries.id\n' +
              '-- additional_cost_summary_rules.costSummaryRulesId -> cost_summary_rules.id\n' +
              '-- ai_model_version_change_history.version_id -> ai_model_versions.id\n' +
              '-- ai_model_versions.model_id -> ai_models.id\n' +
              '-- user_requests.user_id -> users.id\n' +
              '-- user_roles.user_id -> users.id\n' +
              '-- user_roles.role_id -> roles.id\n' +
              '\n' +
              'General Querying Guidelines for the LLM:\n' +
              '- **Date/Time Conversion**: All `BIGINT` columns representing timestamps (`created_at`, `updated_at`, `received_at`, `creation_date`, `modified_date`, `reply_date`, `last_email_time`, `date`, `time`, `expected_tat_datetime`, `task_completion_date`, `changed_at`, `release_date`, `requested_at`) are Unix timestamps (seconds or milliseconds since epoch). When a user asks for human-readable dates or filters by date ranges, convert these to standard SQL date/time functions (e.g., `to_timestamp`, `FROM_UNIXTIME`, `DATE_TRUNC`). For example, to filter by month, use functions like `DATE_TRUNC(\'month\', to_timestamp(created_at)) = DATE_TRUNC(\'month\', NOW())`.\n' +
              '- **Joins**: Automatically identify and use `INNER JOIN` or `LEFT JOIN` clauses where foreign key relationships (explicitly listed in the "Table Relationships" section or indicated by "FK to Table.Column" in column details) exist and are necessary to fulfill the query (e.g., getting email subject for a task, or job details for an email).\n' +
              '- **Case Sensitivity**: For `TEXT` and `CHARACTER VARYING` columns, assume case-insensitive matching for user queries unless specified (e.g., use `ILIKE` instead of `=` for `status`, `category`, `name`, `subject`, `sender`, `file_name`, `tag_name`, `rule_name`, `project_name`, `job_name`, `role_name`, `description`, `language_code`). However, for specific exact matches, `=` is acceptable if the user implies strictness.\n' +
              '- **Aggregations**: Use `COUNT(*)`, `SUM()`, `AVG()`, `MIN()`, `MAX()` with appropriate `GROUP BY` clauses for statistical queries.\n' +
              '- **Filtering**: Apply `WHERE` clauses for all filtering conditions. Use `AND` / `OR` as needed.\n' +
              '- **Limiting Results**: Always include `LIMIT X` when the user asks for a specific number of results (e.g., "first 5", "top 10").\n' +
              '- **Ordering Results**: Include `ORDER BY` when the user specifies an order (e.g., "newest first", "by price").\n' +
              '- **Boolean Interpretation**: If a column seems to imply a boolean (e.g., any `is_` or `has_` prefixed columns you might add), map common terms like "yes", "no", "true", "false", "active", "inactive" appropriately.\n' +
              '- **Ambiguity**: If a column name is ambiguous (e.g., multiple `id`s), use table aliases to clarify (e.g., `e.id` for `emails.id`).\n' +
              '- **Table Name Nuances**: \n' +
              '  - `"job"` vs `"jobs"`: Note that you have both `job` (basic, `id`, `name`) and `jobs` (more detailed, `id`, `job_id`, `job_status`, etc.) tables. Differentiate these carefully. It appears `jobs` is the more comprehensive table for most job-related queries. `job_id` in `jobs` is unique. `jobid` in `job_rules` is a foreign key to `jobs.id`.\n' +
              '  - `"rule_detail"` / `"rule_details"` / `"rule_template"` / `"rule_templates"`: Be careful to use the correct singular/plural table names as provided in the "Postgres Tables" list. Infer relationships based on the "FK to" comments and the "Table Relationships" section.\n' +
              '  - **Ambiguous "rules"**: When the user refers to "rules" generically, default to `job_rules` for general rule queries. If the query is about "cost rules," use `cost_summary_rules`. **DO NOT use a table named `rules` as it does not exist.** If the context clearly indicates another specific rules-related table (e.g., `rule_details`, `rule_templates`, `order_cost_summary_rules`, `package_cost_summary_rules`, `additional_cost_summary_rules`), use that instead.\n' +
              '  - Consider `email_job_mappers` vs `email_jobs` as potentially redundant if their purpose is identical.\n' +
              '  - Pay attention to `internal_view` and `internal_views` - use the one explicitly requested or that fits context best.\n' +
              '\n' +
              'Example Complex Query Generation (for reference and guidance):\n' +
              '-- User: "Give me the subject and sender of emails that have files and are linked to a job with status \'Active\'."\n' +
              '-- SQL: SELECT DISTINCT e.subject, e.sender FROM emails e JOIN email_files ef ON e.id = ef.email_id JOIN email_job_mappers ejm ON e.id = ejm.email_id JOIN jobs j ON ejm.job_id = j.id WHERE j.job_status ILIKE \'Active\';\n' +
              '\n' +
              '-- User: "Count how many tasks with status \'Completed\' were created by users named \'John Doe\' this month."\n' +
              '-- SQL: SELECT COUNT(t.id) FROM tasks t JOIN users u ON t.created_by = u.id WHERE t.status ILIKE \'Completed\' AND u.name ILIKE \'John Doe\' AND to_timestamp(t.creation_date) >= DATE_TRUNC(\'month\', NOW()) AND to_timestamp(t.creation_date) < DATE_TRUNC(\'month\', NOW()) + INTERVAL \'1 month\';\n' +
              '\n' +
              '-- User: "List all rule details for \'Translation\' category, including the template name and associated job name."\n' +
              '-- SQL: SELECT rd.rule_name, rd.category, rt.name AS template_name, j.job_name FROM rule_details rd JOIN rule_templates rt ON rd.template_id = rt.id LEFT JOIN jobs j ON rt.job_id = j.id WHERE rd.category ILIKE \'Translation\';\n' +
              '\n' +
              '-- User: "Show me the top 3 highest total priced internal views from the \'Review\' category."\n' +
              '-- SQL: SELECT rule_name, category, total_price FROM internal_views WHERE category ILIKE \'Review\' ORDER BY total_price DESC LIMIT 3;\n' +
              '\n' +
              '-- User: "What are the names of packages and their associated total final prices, if available?"\n' +
              '-- SQL: SELECT p.id AS package_id, pr.final_price FROM packages p LEFT JOIN external_cost_summaries ecs ON p.external_cost_summary_id = ecs.id LEFT JOIN pricing pr ON ecs.id = pr.external_cost_summary_id;\n' +
              '\n' +
              'Remember to analyze the user\'s full intent and determine all necessary tables and joins before generating the final SQL.'+
            '\n **NOTE** If the generated query has parameter, generate it like this: $1 $2 ...etc even it has only 1 parameter. Donot generate like ?. Give like $1'

          },
          { role: 'user', content: prompt },
        ],
        tools,
        stream: false, // Disable streaming for simpler handling
      }),
    );
  }

  // private async sendPromptToLLM(prompt: string, tools: any[]): Promise<any> {
  //   const context = `Context: The following is a list of user-created PostgreSQL table names from my current database schema. These are the core business/domain tables, excluding system-generated sequences or internal system tables.
  //                    Postgres Tables: additional, additional_cost_summary_rules, ai_model_version_change_history, ai_model_versions, ai_models, billable_items, client_view, conditions, cost_summary_rule_tasks, cost_summary_rules, email, email_file_change_details, email_files, email_job_mappers, email_replies, email_tags, emails, external_cost_summaries, internal_views, job, job_activity, job_activity_logs, job_rule_conditions, job_rules, jobs, order_cost_summary_rules, others, package_cost_summary_rules, packages, plans, pricing, roles, rule_detail, rule_details, rule_template, rule_templates, sub_task_types, task_types, tasks, tcc_attachments, tcc_job_sales_persons, tcc_languages, tcc_master_data, tcc_projects, tcc_sync_details, tcc_task_attachments, tcc_translation_tasks, tcc_type_settings_tasks, tcc_users, user_requests, user_roles, users.`;
  //
  //   const requestBody = {
  //     contents: [
  //       {
  //         parts: [
  //           {
  //             text: `${context}\n\n${prompt}`,
  //           },
  //         ],
  //       },
  //     ],
  //   };
  //
  //   const GEMINI_API_KEY = 'GMN Secret'; // Replace with env var in production
  //   const GEMINI_ENDPOINT =
  //     'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  //
  //   return await firstValueFrom(
  //     this.httpService.post(GEMINI_ENDPOINT, requestBody, {
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'X-goog-api-key': GEMINI_API_KEY,
  //       },
  //     }),
  //   );
  // }

  private getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'simple_reply',
          description: 'Provides simple text replies for basic interactions like greetings, farewells, and casual conversation',
          parameters: simpleReplyJSON,
        },
      },
      {
        type: 'function',
        function: {
          name: 'sum',
          description: 'Calculates the sum of two numbers',
          parameters: sumJSON,
        },
      },
      {
        type: 'function',
        function: {
          name: 'sub',
          description: 'Calculates the sub of two numbers',
          parameters: subJSON,
        },
      },
      {
        type: 'function',
        function: {
          name: 'executeRawQuery',
          description: 'Executes a raw SQL query with parameters',
          parameters: queryExecutorJSON,
        },
      },
    ];
  }

  async sendTextToLLM(prompt: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://192.168.10.28:11434/api/chat', {
          model: 'llama3',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      );

      return response.data?.message?.content;
    } catch (error) {
      console.error('LLM Error:', error.message, error.response?.data); // Debug log
      throw new BadRequestException(
        `Failed to communicate with LLM: ${error.message}`,
      );
    }
  }
}
