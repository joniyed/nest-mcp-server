import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { queryExecutorJSON, simpleReplyJSON, subJSON, sumJSON } from '../tools/tools.schema.js';
import { ToolsService } from '../tools/tools.service.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { jobs_context } from './table-contexts/jobs_context.js';
import { TableContext } from './table-contexts/index.js';
import { emailFilesContext } from './table-contexts/email_files.context.js';

@Injectable()
export class McpService {
  private readonly server: Server;

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
              b: args.b as number,
            });
            break;

          case 'sub':
            toolResponse = this.toolsService.sub({
              a: args.a as number,
              b: args.b as number,
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
                details: { originalPrompt: prompt },
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
          details: { prompt },
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
          details: { prompt },
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
            content: this.getTableContexts(['tasks']),
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

  // Utility to get context for required tables
  private getTableContexts(tableNames: string[]): string {
    const contextMap: Record<string, string> = {
      emails: TableContext.emailContext,
      jobs: jobs_context,
      email_files: emailFilesContext,
      email_replies: emailRepliesContext,
      users: usersContext,
      rule_details: ruleDetailsContext,
      rule_templates: ruleTemplatesContext,
      plans: plansContext,
      tasks: tasksContext,
      job_rules: jobRulesContext,
      cost_summary_rules: costSummaryRulesContext,
      billable_items: billableItemsContext,
      job_activity: jobActivityContext,
      job_activity_logs: jobActivityLogsContext,
      conditions: conditionsContext,
      cost_summary_rule_tasks: costSummaryRuleTasksContext,
      cost_summary_rules_task_list_tasks: costSummaryRulesTaskListTasksContext,
      order_cost_summary_rules: orderCostSummaryRulesContext,
      package_cost_summary_rules: packageCostSummaryRulesContext,
      packages: packagesContext,
      pricing: pricingContext,
      additional_cost_summary_rules: additionalCostSummaryRulesContext,
      external_cost_summaries: externalCostSummariesContext,
      ai_models: aiModelsContext,
      ai_model_versions: aiModelVersionsContext,
      ai_model_version_change_history: aiModelVersionChangeHistoryContext,
      client_view: clientViewContext,
      roles: rolesContext,
      user_requests: userRequestsContext,
      user_roles: userRolesContext,
      tcc_attachments: tccAttachmentsContext,
      tcc_job_sales_persons: tccJobSalesPersonsContext,
      tcc_languages: tccLanguagesContext,
      tcc_master_data: tccMasterDataContext,
      tcc_projects: tccProjectsContext,
      tcc_sync_details: tccSyncDetailsContext,
      tcc_task_attachments: tccTaskAttachmentsContext,
      tcc_translation_tasks: tccTranslationTasksContext,
      tcc_type_settings_tasks: tccTypeSettingsTasksContext,
      tcc_users: tccUsersContext,
      task_types: taskTypesContext,
      sub_task_types: subTaskTypesContext,
    };
    return tableNames.map(t => contextMap[t]).filter(Boolean).join('\n');
  }
}
