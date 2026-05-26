import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  readCodeGraphyWorkspaceStatusForCli,
  requestCodeGraphyIndexWorkspace,
  requestWorkspaceGraphQuery,
  runPluginsCommand,
  type CliCommand,
  type CommandExecutionResult,
  type IndexWorkspaceResult,
  type PluginsCommandAction,
  type WorkspaceGraphQueryInput,
  type WorkspaceGraphQueryResult,
  type WorkspacePathInput,
  type WorkspaceStatusResult,
  type WorkspaceGraphQueryReport,
} from '@codegraphy-dev/core';
import * as z from 'zod/v4';

interface CodeGraphyMcpServerDependencies {
  cwd(): string;
  indexWorkspace(input: WorkspacePathInput): Promise<IndexWorkspaceResult>;
  runGraphQuery(input: WorkspaceGraphQueryInput): Promise<WorkspaceGraphQueryResult>;
  runPluginsCommand?(command: CliCommand): Promise<CommandExecutionResult>;
  statusWorkspace(input: WorkspacePathInput): Promise<WorkspaceStatusResult> | WorkspaceStatusResult;
}

const DEFAULT_DEPENDENCIES: CodeGraphyMcpServerDependencies = {
  cwd: () => process.cwd(),
  indexWorkspace: requestCodeGraphyIndexWorkspace,
  runGraphQuery: requestWorkspaceGraphQuery,
  statusWorkspace: readCodeGraphyWorkspaceStatusForCli,
};

const directionSchema = z.enum(['asc', 'desc']).optional();
const sortSchema = z.array(z.object({
  by: z.string(),
  direction: directionSchema,
})).optional();
const filterSchema = z.array(z.object({
  field: z.string(),
  op: z.string(),
  value: z.unknown(),
})).optional();
const scopeSchema = z.object({
  nodes: z.record(z.string(), z.boolean()).optional(),
  edges: z.record(z.string(), z.boolean()).optional(),
}).optional();
const workspacePathSchema = {
  path: z.string().optional(),
};
const packagePluginSchema = {
  ...workspacePathSchema,
  packageName: z.string().min(1),
};
const listQuerySchema = {
  ...workspacePathSchema,
  scope: scopeSchema,
  filters: filterSchema,
  search: z.string().optional(),
  sort: sortSchema,
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
};

function renderToolText(result: unknown): string {
  return JSON.stringify(result, null, 2);
}

function createToolResult<T extends Record<string, unknown>>(result: T) {
  return {
    structuredContent: result,
    content: [{ type: 'text' as const, text: renderToolText(result) }],
  };
}

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

function splitWorkspacePath(input: Record<string, unknown>): {
  workspacePath?: string;
  arguments: Record<string, unknown>;
} {
  const { path, ...args } = input;
  return {
    workspacePath: typeof path === 'string' ? path : undefined,
    arguments: args,
  };
}

function resolveInputWorkspacePath(
  workspacePath: string | undefined,
  dependencies: CodeGraphyMcpServerDependencies,
): string {
  return workspacePath ?? dependencies.cwd();
}

function registerGraphQueryTool(
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

export function createCodeGraphyMcpServer(
  dependencies: CodeGraphyMcpServerDependencies = DEFAULT_DEPENDENCIES,
): McpServer {
  const server = new McpServer({
    name: 'codegraphy',
    version: '0.1.0',
  });

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
      description: 'List installed plugins and which ones are enabled for the current or explicit CodeGraphy Workspace.',
      inputSchema: z.object(workspacePathSchema),
    },
    async ({ path }) => createPluginCommandResult(await executePluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: path,
    }, dependencies)),
  );

  for (const action of ['enable', 'disable'] satisfies PluginsCommandAction[]) {
    server.registerTool(
      `codegraphy_plugins_${action}`,
      {
        description: `${action === 'enable' ? 'Enable' : 'Disable'} a cached plugin package for the current or explicit CodeGraphy Workspace.`,
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

  registerGraphQueryTool(
    server,
    dependencies,
    'nodes',
    'codegraphy_list_nodes',
    'List indexed Relationship Graph nodes for a CodeGraphy Workspace. Defaults to File Nodes; folders and packages are included through Graph Scope.',
    {
      ...listQuerySchema,
      showOrphans: z.boolean().optional(),
    },
  );

  registerGraphQueryTool(
    server,
    dependencies,
    'edges',
    'codegraphy_list_edges',
    'List high-level node connections with grouped Edge Types. Broad calls are paginated.',
    {
      ...listQuerySchema,
      from: z.string().optional(),
      to: z.string().optional(),
      edgeType: z.string().optional(),
    },
  );

  registerGraphQueryTool(
    server,
    dependencies,
    'relationships',
    'codegraphy_list_relationships',
    'List detailed Relationships grouped by node pair and Edge Type. Broad calls can be large and are paginated.',
    {
      ...listQuerySchema,
      from: z.string().optional(),
      to: z.string().optional(),
      edgeType: z.string().optional(),
    },
  );

  registerGraphQueryTool(
    server,
    dependencies,
    'symbols',
    'codegraphy_list_symbols',
    'List symbol declarations or Relationship-backed symbol evidence. Broad calls can be large and are paginated.',
    {
      ...listQuerySchema,
      filePath: z.string().optional(),
      relatedFrom: z.string().optional(),
      relatedTo: z.string().optional(),
      edgeType: z.string().optional(),
    },
  );

  registerGraphQueryTool(
    server,
    dependencies,
    'paths',
    'codegraphy_find_paths',
    'Return bounded directed node paths from one exact node path to another. Paths contain nodes only.',
    {
      ...workspacePathSchema,
      from: z.string(),
      to: z.string(),
      maxDepth: z.number().int().positive().optional(),
      maxPaths: z.number().int().positive().optional(),
    },
  );

  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createCodeGraphyMcpServer();
  await server.connect(new StdioServerTransport());
}
