export interface McpToolCallRequest {
  server: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface McpToolCallResult {
  content: unknown;
  isError?: boolean | undefined;
}

export interface McpServerClient {
  name: string;
  callTool(request: McpToolCallRequest): Promise<McpToolCallResult>;
}

export interface McpRegistry {
  registerServer(client: McpServerClient): void;
  getServer(name: string): McpServerClient | undefined;
  listServers(): McpServerClient[];
  callTool(request: McpToolCallRequest): Promise<McpToolCallResult>;
}

