export interface ToolResponse {
  success: boolean;
  data: {
    result: any;
    details?: any;
  };
  message: string;
  toolName: string;
  timestamp: string;
  error?: string;
}
