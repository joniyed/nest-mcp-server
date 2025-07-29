import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { queryExecutorJSON, subJSON, sumJSON } from '../tools/tools.schema.js';
import { ToolsService } from '../tools/tools.service.js';

@Injectable()
export class McpService {
  constructor(
    private readonly httpService: HttpService,
    private readonly toolsService: ToolsService,
  ) {}

  async queryLLM(prompt: string, retryCount = 0): Promise<any> {
    const tools = this.getTools();

    try {
      const response = await this.sendPromptToLLM(prompt, tools);
      const data = response.data;
      console.log('LLM Response: ' + JSON.stringify(data.message));

      let res = new Map<string, any>();

      if (data.message?.tool_calls?.length) {
        for (const toolCall of data.message.tool_calls) {
          try {
            if (toolCall.function.name === 'sum') {
              const { a, b } = toolCall.function.arguments;
              const resultResponse = this.toolsService.sum({ a, b });
              res.set('sum', resultResponse);
            }

            if (toolCall.function.name === 'sub') {
              const { a, b } = toolCall.function.arguments;
              const resultResponse = this.toolsService.sub({ a, b });
              res.set('sub', resultResponse);
            }

            if (toolCall.function.name === 'executeRawQuery') {
              const { sql, params } = toolCall.function.arguments;
              const resultResponse = await this.toolsService.executeRawQuery(
                sql,
                params,
              );
              res.set('Query Result', resultResponse);
            }
          } catch (toolError) {
            console.warn(
              `❗ Tool execution failed for ${toolCall.function.name}:`,
              toolError.message || toolError,
            );

            if (retryCount < 10) {
              // Retry by calling queryLLM again with the error context
              const retryPrompt = `An error occurred while executing the tool "${toolCall.function.name}": ${toolError.message || toolError}. Please try again or suggest an alternative.`;
              return this.queryLLM(
                `${retryPrompt}. Original Prompt: ${prompt}`,
              );
            } else {
              return {
                response: `Failed after retrying tool "${toolCall.function.name}".`,
                error: toolError.message || toolError.toString(),
              };
            }
          }
        }

        // const result = await this.sendTextToLLM(
        //   `Prompt: ${prompt}, Query: ${JSON.stringify(Object.fromEntries(res))}. I want this response as human readable text. Give only the response without any additional text.`,
        // );
        return Object.fromEntries(res);
      }

      return {
        response: data.message?.content || 'No response from LLM',
      };
    } catch (error) {
      console.error('Error querying LLM:', error);
      return {
        response: 'Failed to query LLM or execute tool',
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
        model: 'llama3.1', // Ensure this model supports tool-calling
        messages: [
          {
            role: 'system',
            content:
              'Context:\n' +
              'The following is a list of user-created PostgresSQL table names from my current database schema. These are the core business/domain tables, excluding system-generated sequences or internal system tables.\n' +
              '\n' +
              'Postgres Tables:\n' +
              'additional, additional_cost_summary_rules, ai_model_version_change_history, ai_model_versions, ai_models, billable_items, client_view, conditions, cost_summary_rule_tasks, cost_summary_rules, email, email_file_change_details, email_files, email_job_mappers, email_replies, email_tags, emails, external_cost_summaries, internal_views, job, job_activity, job_activity_logs, job_rule_conditions, job_rules, jobs, order_cost_summary_rules, others, package_cost_summary_rules, packages, plans, pricing, roles, rule_detail, rule_details, rule_template, rule_templates, sub_task_types, task_types, tasks, tcc_attachments, tcc_job_sales_persons, tcc_languages, tcc_master_data, tcc_projects, tcc_sync_details, tcc_task_attachments, tcc_translation_tasks, tcc_type_settings_tasks, tcc_users, user_requests, user_roles, users',
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
  //   const GEMINI_API_KEY = 'AIzaSyD5YsRKdFhbUxcdmL8ayv2rv2GjvtZO8I0'; // Replace with env var in production
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
          name: 'sum',
          description: 'Calculates the sum of two numbers',
          parameters: sumJSON, // Make sure sumJSON is correctly defined JSON Schema
        },
      },
      {
        type: 'function',
        function: {
          name: 'sub',
          description: 'Calculates the sub of two numbers',
          parameters: subJSON, // Make sure sumJSON is correctly defined JSON Schema
        },
      },
      {
        type: 'function',
        function: {
          name: 'executeRawQuery',
          description: 'Executes a raw SQL query with parameters',
          parameters: queryExecutorJSON, // Make sure sumJSON is correctly defined JSON Schema
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
