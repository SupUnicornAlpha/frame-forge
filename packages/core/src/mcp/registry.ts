import type {
  McpRegistry,
  McpServerClient,
  McpToolCallRequest,
  McpToolCallResult,
} from './types.js';

export class InMemoryMcpRegistry implements McpRegistry {
  private readonly servers = new Map<string, McpServerClient>();

  registerServer(client: McpServerClient): void {
    this.servers.set(client.name, client);
  }

  getServer(name: string): McpServerClient | undefined {
    return this.servers.get(name);
  }

  listServers(): McpServerClient[] {
    return Array.from(this.servers.values());
  }

  async callTool(request: McpToolCallRequest): Promise<McpToolCallResult> {
    const server = this.getServer(request.server);
    if (!server) {
      return { content: `MCP server "${request.server}" not found`, isError: true };
    }
    return server.callTool(request);
  }
}

