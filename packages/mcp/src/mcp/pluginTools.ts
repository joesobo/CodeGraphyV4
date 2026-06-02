import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runPluginsCommand, type CliCommand, type CommandExecutionResult, type PluginsCommandAction } from '@codegraphy-dev/core';
import * as z from 'zod/v4';
import type { CodeGraphyMcpServerDependencies } from './contracts';
import { createMcpDiagnostics } from './diagnostics';
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
    async (input) => {
      const diagnostics = createMcpDiagnostics(input);
      const result = await executePluginsCommand({
        name: 'plugins',
        action,
        packageName: input.packageName,
        workspacePath: input.path,
        ...(input.verboseDiagnostics === true ? { verbose: true } : {}),
      }, dependencies);
      return createToolResult(diagnostics.withDiagnostics({
        exitCode: result.exitCode,
        output: result.output,
      }));
    },
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
      inputSchema: z.object({
        packageName: packagePluginSchema.packageName,
        verboseDiagnostics: workspacePathSchema.verboseDiagnostics,
      }),
    },
    async (input) => {
      const diagnostics = createMcpDiagnostics(input);
      const result = await executePluginsCommand({
        name: 'plugins',
        action: 'register',
        packageName: input.packageName,
        ...(input.verboseDiagnostics === true ? { verbose: true } : {}),
      }, dependencies);
      return createToolResult(diagnostics.withDiagnostics({
        exitCode: result.exitCode,
        output: result.output,
      }));
    },
  );

  server.registerTool(
    'codegraphy_plugins_list',
    {
      description: 'List registered plugins and which ones are enabled for the current or explicit CodeGraphy Workspace.',
      inputSchema: z.object(workspacePathSchema),
    },
    async (input) => {
      const diagnostics = createMcpDiagnostics(input);
      const result = await executePluginsCommand({
        name: 'plugins',
        action: 'list',
        workspacePath: input.path,
        ...(input.verboseDiagnostics === true ? { verbose: true } : {}),
      }, dependencies);
      return createToolResult(diagnostics.withDiagnostics({
        exitCode: result.exitCode,
        output: result.output,
      }));
    },
  );

  for (const action of ['enable', 'disable'] satisfies PluginsCommandAction[]) {
    registerPluginToggleTool(server, dependencies, action);
  }
}
