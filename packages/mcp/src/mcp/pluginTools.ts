import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runPluginsCommand, type CliCommand, type CommandExecutionResult, type PluginsCommandAction } from '@codegraphy-dev/core';
import * as z from 'zod/v4';
import type { CodeGraphyMcpServerDependencies } from './contracts';
import { packagePluginSchema, workspacePathSchema } from './schemas';
import { createToolResult } from './toolResult';

async function executePluginsCommand(
  command: CliCommand,
  dependencies: CodeGraphyMcpServerDependencies,
): Promise<CommandExecutionResult> {
  return dependencies.runPluginsCommand
    ? dependencies.runPluginsCommand(command)
    : runPluginsCommand(command, { cwd: () => dependencies.cwd() });
}

function createPluginCommandResult(result: CommandExecutionResult) {
  return createToolResult({
    exitCode: result.exitCode,
    output: result.output,
  });
}

function registerPluginToggleTool(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
  action: PluginsCommandAction,
): void {
  server.registerTool(
    `codegraphy_plugins_${action}`,
    {
      description: `${action === 'enable' ? 'Enable' : 'Disable'} a registered plugin package for the current or explicit CodeGraphy Workspace.`,
      inputSchema: z.object(packagePluginSchema),
    },
    async ({ packageName, path }) => createPluginCommandResult(await executePluginsCommand({
      name: 'plugins',
      action,
      packageName,
      workspacePath: path,
    }, dependencies)),
  );
}

export function registerPluginTools(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
): void {
  server.registerTool(
    'codegraphy_plugins_register',
    {
      description: 'Register an explicitly named globally installed CodeGraphy plugin package in ~/.codegraphy/plugins.json.',
      inputSchema: z.object({ packageName: packagePluginSchema.packageName }),
    },
    async ({ packageName }) => createPluginCommandResult(await executePluginsCommand({
      name: 'plugins',
      action: 'register',
      packageName,
    }, dependencies)),
  );

  server.registerTool(
    'codegraphy_plugins_list',
    {
      description: 'List registered plugins and which ones are enabled for the current or explicit CodeGraphy Workspace.',
      inputSchema: z.object(workspacePathSchema),
    },
    async ({ path }) => createPluginCommandResult(await executePluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: path,
    }, dependencies)),
  );

  for (const action of ['enable', 'disable'] satisfies PluginsCommandAction[]) {
    registerPluginToggleTool(server, dependencies, action);
  }
}
