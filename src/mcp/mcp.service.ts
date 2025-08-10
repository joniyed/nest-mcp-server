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
      this.httpService.post('http://192.168.68.121:11434/api/chat', {
        // model: 'gpt-oss:120b', // Ensure this model supports tool-calling
        model: 'llama3.1', // Ensure this model supports tool-calling
        messages: [
          {
            role: 'system',
            // In McpService, sendPromptToLLM method, within the system role content:
            content:
              'Context: ' +
              '\n' +
              'You are an expert PostgreSQL query generator. Your task is to translate user requests into precise and efficient SQL queries using the provided database schema. Always prioritize selecting relevant columns, applying correct JOIN operations, and filtering data accurately based on the user\'s intent. Pay close attention to data types and potential case sensitivity for string comparisons.\n' +
              '\n' +
              'Postgres Tables:\n' +
              'sub_task_types, task_types, tasks\n' +
              '\n' +
              'PostgreSQL Database Schema Details:\n' +

              '-- Table: tasks (Details of tasks, linked to jobs and email)\n' +
              '-- Columns: id BIGINT (PK), task_identity BIGINT, row_version CHARACTER VARYING(100), language CHARACTER VARYING(100), creation_date BIGINT, modified_date BIGINT, created_by BIGINT (FK to users.id), modified_by BIGINT (FK to users.id), task_type_id BIGINT (FK to task_types.id), status CHARACTER VARYING(100), task_id CHARACTER VARYING(255), expected_tat_datetime BIGINT, total_number_of_pages INTEGER, proof_read_by_id BIGINT (FK to users.id), email_id BIGINT (FK to emails.id), task_completion_date BIGINT, previous_status BIGINT, tera_task_id BIGINT, created_at BIGINT, updated_at BIGINT, sub_task_type_id BIGINT (FK to sub_task_types.id), job_id BIGINT (FK to jobs.id)\n' +
              '\n' +
              '-- Table: task_types (Defines different types of tasks)\n' +
              '-- Columns: id BIGINT (PK), task_type_id BIGINT, creation_date BIGINT, modified_date BIGINT, name CHARACTER VARYING(100), created_at BIGINT, updated_at BIGINT\n' +
              '\n' +
              '-- Table: sub_task_types (Defines sub-types for tasks)\n' +
              '-- Columns: id BIGINT (PK), sub_task_type_id BIGINT, name CHARACTER VARYING(100), creation_date BIGINT, modified_date BIGINT, created_at BIGINT, updated_at BIGINT\n' +
              '\n' +
              '-----------------------------------------------------------\n' +
              '-- Table Relationships (Foreign Keys for JOIN operations):\n' +
              '-----------------------------------------------------------\n' +

              '-- tasks.task_type_id -> task_types.id\n' +
              '-- tasks.proof_read_by_id -> users.id\n' +
              '-- tasks.email_id -> emails.id\n' +
              '-- tasks.sub_task_type_id -> sub_task_types.id\n' +

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
              '\n' +
              'Example Complex Query Generation (for reference and guidance):\n' +
              '-- User: "Give me first 5 tasks which status is  \'Completed\'."\n' +
              '-- SQL: SELECT DISTINCT e.subject, e.sender FROM emails e JOIN email_files ef ON e.id = ef.email_id JOIN email_job_mappers ejm ON e.id = ejm.email_id JOIN jobs j ON ejm.job_id = j.id WHERE j.job_status ILIKE \'Active\';\n' +
              '\n' +
              '-- User: "Count how many tasks with status \'Completed\' were created by users named \'John Doe\' this month."\n' +
              '-- SQL: SELECT COUNT(t.id) FROM tasks t JOIN users u ON t.created_by = u.id WHERE t.status ILIKE \'Completed\' AND u.name ILIKE \'John Doe\' AND to_timestamp(t.creation_date) >= DATE_TRUNC(\'month\', NOW()) AND to_timestamp(t.creation_date) < DATE_TRUNC(\'month\', NOW()) + INTERVAL \'1 month\';\n' +
              '\n' +
              '-- User: "Give me the tasks which task_id is " \'HIP23020014TY000615\ ."\n' +
              '-- SQL: SELECT rd.rule_name, rd.category, rt.name AS template_name, j.job_name FROM rule_details rd JOIN rule_templates rt ON rd.template_id = rt.id LEFT JOIN jobs j ON rt.job_id = j.id WHERE rd.category ILIKE \'Translation\';\n' +
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
