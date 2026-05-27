import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import type { CodeGraphyMcpServerDependencies } from './contracts';
import { workspacePathSchema } from './schemas';
import { createToolResult } from './toolResult';
import { resolveInputWorkspacePath } from './workspacePath';

export function registerWorkspaceTools(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
): void {
  server.registerTool(
    'codegraphy_status',
    {
      description: 'Report CodeGraphy Workspace status for the current folder or an explicit path.',
      inputSchema: z.object(workspacePathSchema),
    },
    async ({ path }) => createToolResult(await dependencies.statusWorkspace({
      workspacePath: resolveInputWorkspacePath(path, dependencies),
    })),
  );

  server.registerTool(
    'codegraphy_index',
    {
      description: 'Run Indexing for the current or explicit CodeGraphy Workspace path without focusing VS Code.',
      inputSchema: z.object(workspacePathSchema),
    },
    async ({ path }) => createToolResult(await dependencies.indexWorkspace({
      workspacePath: resolveInputWorkspacePath(path, dependencies),
    })),
  );
}
