import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WorkspaceGraphQueryReport } from '@codegraphy-dev/core';
import * as z from 'zod/v4';
import type { CodeGraphyMcpServerDependencies } from './contracts';
import { createToolResult } from './toolResult';
import { resolveInputWorkspacePath, splitWorkspacePath } from './workspacePath';

export function registerGraphQueryTool(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
  report: WorkspaceGraphQueryReport,
  name: string,
  description: string,
  inputSchema: z.ZodRawShape,
): void {
  server.registerTool(
    name,
    {
      description,
      inputSchema: z.object(inputSchema),
    },
    async (input) => {
      const queryInput = splitWorkspacePath(input);
      return createToolResult(await dependencies.runGraphQuery({
        workspacePath: resolveInputWorkspacePath(queryInput.workspacePath, dependencies),
        report,
        arguments: queryInput.arguments,
      }));
    },
  );
}
