import { z } from 'zod';
import type { ToolDef } from '../tool/types.js';
import type { McpRegistry } from './types.js';

const McpCallInputSchema = z.object({
  server: z.string(),
  toolName: z.string(),
  arguments: z.record(z.unknown()).default({}),
});

export function createMcpCallTool(mcpRegistry: McpRegistry): ToolDef {
  return {
    name: 'mcp_call',
    description: 'Call a tool on a registered MCP server',
    inputSchema: McpCallInputSchema,
    isConcurrencySafe: true,
    isReadOnly: false,
    async execute(input) {
      const result = await mcpRegistry.callTool({
        server: input.server,
        toolName: input.toolName,
        arguments: input.arguments,
      });
      return result;
    },
  };
}

