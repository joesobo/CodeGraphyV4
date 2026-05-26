import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DEFAULT_DEPENDENCIES } from './defaultDependencies';
import type { CodeGraphyMcpServerDependencies } from './contracts';
import { registerGraphQueryTools } from './graphQueryTools';
import { registerPluginTools } from './pluginTools';
import { registerWorkspaceTools } from './workspaceTools';

export type { CodeGraphyMcpServerDependencies };

export function createCodeGraphyMcpServer(
  dependencies: CodeGraphyMcpServerDependencies = DEFAULT_DEPENDENCIES,
): McpServer {
  const server = new McpServer({
    name: 'codegraphy',
    version: '0.1.0',
  });

  registerWorkspaceTools(server, dependencies);
  registerPluginTools(server, dependencies);
  registerGraphQueryTools(server, dependencies);
  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createCodeGraphyMcpServer();
  await server.connect(new StdioServerTransport());
}
