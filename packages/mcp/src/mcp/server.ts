import {
  executeCodeGraphyWorkspaceCommand,
  type CodeGraphyWorkspaceCommand,
  type CodeGraphyWorkspaceCommandResponse,
  type GraphQueryRequest,
  type WorkspaceGraphQueryProjection,
} from '@codegraphy-dev/core';
import {
  McpServer,
  type CallToolResult,
} from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

export interface CodeGraphyMcpServerDependencies {
  cwd(): string;
  executeWorkspaceCommand(
    command: CodeGraphyWorkspaceCommand,
  ): Promise<CodeGraphyWorkspaceCommandResponse>;
}

const DEFAULT_DEPENDENCIES: CodeGraphyMcpServerDependencies = {
  cwd: () => process.cwd(),
  executeWorkspaceCommand: executeCodeGraphyWorkspaceCommand,
};

const workspacePath = z.string().min(1).optional()
  .describe('Absolute CodeGraphy Workspace path. Defaults to the MCP server working directory.');
const limit = (defaultValue: number, maximum?: number) => z.number()
  .int()
  .positive()
  .max(maximum ?? Number.MAX_SAFE_INTEGER)
  .default(defaultValue);
const offset = z.number().int().nonnegative().optional();
const projectionFields = {
  filterPatterns: z.array(z.string().min(1)).optional()
    .describe('Temporary path Filters for this call. Does not change workspace settings.'),
  nodeTypes: z.array(z.string().min(1)).optional()
    .describe('Temporary Node Type projection for this call.'),
  edgeTypes: z.array(z.string().min(1)).optional()
    .describe('Temporary Edge Type projection for this call.'),
};
const workspaceFields = {
  workspacePath,
};
const pagedFields = {
  limit: limit(100),
  offset,
};
const workspaceProjectionFields = {
  ...workspaceFields,
  ...projectionFields,
};
const pagedWorkspaceProjectionFields = {
  ...workspaceProjectionFields,
  ...pagedFields,
};

type ToolInput = {
  workspacePath?: string;
  filterPatterns?: string[];
  nodeTypes?: string[];
  edgeTypes?: string[];
};

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} satisfies NonNullable<Parameters<McpServer['registerTool']>[1]>['annotations'];

const indexAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} satisfies NonNullable<Parameters<McpServer['registerTool']>[1]>['annotations'];

function readProjection(input: ToolInput): WorkspaceGraphQueryProjection | undefined {
  const projection: WorkspaceGraphQueryProjection = {
    ...(input.filterPatterns ? { filterPatterns: input.filterPatterns } : {}),
    ...(input.nodeTypes ? { nodeTypes: input.nodeTypes } : {}),
    ...(input.edgeTypes ? { edgeTypes: input.edgeTypes } : {}),
  };
  return Object.keys(projection).length > 0 ? projection : undefined;
}

function createToolResult(response: CodeGraphyWorkspaceCommandResponse): CallToolResult {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2),
    }],
    structuredContent: response as unknown as Record<string, unknown>,
    ...(response.ok ? {} : { isError: true }),
  };
}

async function execute(
  dependencies: CodeGraphyMcpServerDependencies,
  command: CodeGraphyWorkspaceCommand,
): Promise<CallToolResult> {
  return createToolResult(await dependencies.executeWorkspaceCommand(command));
}

function workspaceCommandPath(
  input: ToolInput,
  dependencies: CodeGraphyMcpServerDependencies,
): string {
  return input.workspacePath ?? dependencies.cwd();
}

function createQueryCommand(
  input: ToolInput,
  dependencies: CodeGraphyMcpServerDependencies,
  query: GraphQueryRequest,
): CodeGraphyWorkspaceCommand {
  const projection = readProjection(input);
  const selectedPath = workspaceCommandPath(input, dependencies);
  return {
    command: 'query',
    workspacePath: selectedPath,
    query,
    ...(projection ? { projection } : {}),
  };
}

function registerWorkspaceTools(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
): void {
  server.registerTool(
    'codegraphy_status',
    {
      description: 'Report Graph Cache freshness and stale reasons for a CodeGraphy Workspace.',
      inputSchema: z.object(workspaceFields),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, {
      command: 'status',
      workspacePath: workspaceCommandPath(input, dependencies),
    }),
  );

  server.registerTool(
    'codegraphy_index',
    {
      description: 'Create or incrementally update the CodeGraphy Workspace Graph Cache.',
      inputSchema: z.object(workspaceFields),
      annotations: indexAnnotations,
    },
    async input => execute(dependencies, {
      command: 'index',
      workspacePath: workspaceCommandPath(input, dependencies),
    }),
  );
}

function registerDiscoveryTools(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
): void {
  server.registerTool(
    'codegraphy_search',
    {
      description: 'Search live source, cached AST Symbols, and indexed Nodes with freshness provenance.',
      inputSchema: z.object({
        ...workspaceProjectionFields,
        pattern: z.string().min(1),
        limit: limit(20),
        offset,
      }),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, createQueryCommand(input, dependencies, {
      report: 'search',
      arguments: {
        pattern: input.pattern,
        limit: input.limit,
        ...(input.offset !== undefined ? { offset: input.offset } : {}),
      },
    })),
  );

  server.registerTool(
    'codegraphy_map',
    {
      description: 'Build a bounded task-personalized File map from live terms and cached Relationships.',
      inputSchema: z.object({
        ...workspaceProjectionFields,
        query: z.string().min(1),
        limit: limit(8, 20),
        offset,
      }),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, createQueryCommand(input, dependencies, {
      report: 'task-map',
      arguments: {
        query: input.query,
        limit: input.limit,
        ...(input.offset !== undefined ? { offset: input.offset } : {}),
      },
    })),
  );

  server.registerTool(
    'codegraphy_query',
    {
      description: 'Inspect one exact File or Symbol Node with declarations and incoming and outgoing Relationships.',
      inputSchema: z.object({
        ...workspaceProjectionFields,
        target: z.string().min(1),
      }),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, createQueryCommand(input, dependencies, {
      report: 'overview',
      arguments: {
        target: input.target,
      },
    })),
  );
}

function registerInventoryTools(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
): void {
  server.registerTool(
    'codegraphy_nodes',
    {
      description: 'List bounded Nodes from the shaped Relationship Graph.',
      inputSchema: z.object(pagedWorkspaceProjectionFields),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, createQueryCommand(input, dependencies, {
      report: 'nodes',
      arguments: {
        limit: input.limit,
        ...(input.offset !== undefined ? { offset: input.offset } : {}),
      },
    })),
  );

  server.registerTool(
    'codegraphy_edges',
    {
      description: 'List bounded Relationships from the shaped Relationship Graph.',
      inputSchema: z.object(pagedWorkspaceProjectionFields),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, createQueryCommand(input, dependencies, {
      report: 'edges',
      arguments: {
        limit: input.limit,
        ...(input.offset !== undefined ? { offset: input.offset } : {}),
      },
    })),
  );
}

function registerNavigationTools(
  server: McpServer,
  dependencies: CodeGraphyMcpServerDependencies,
): void {
  const connectionFields = {
    ...pagedWorkspaceProjectionFields,
    target: z.string().min(1),
  };
  server.registerTool(
    'codegraphy_dependencies',
    {
      description: 'List bounded outgoing Relationships from one exact File or Node.',
      inputSchema: z.object(connectionFields),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, createQueryCommand(input, dependencies, {
      report: 'edges',
      arguments: {
        from: input.target,
        expandFileSelectors: true,
        projectFileEndpoints: true,
        limit: input.limit,
        ...(input.offset !== undefined ? { offset: input.offset } : {}),
      },
    })),
  );

  server.registerTool(
    'codegraphy_dependents',
    {
      description: 'List bounded incoming Relationships to one exact File or Node.',
      inputSchema: z.object(connectionFields),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, createQueryCommand(input, dependencies, {
      report: 'edges',
      arguments: {
        to: input.target,
        expandFileSelectors: true,
        projectFileEndpoints: true,
        limit: input.limit,
        ...(input.offset !== undefined ? { offset: input.offset } : {}),
      },
    })),
  );

  server.registerTool(
    'codegraphy_path',
    {
      description: 'Find bounded directed Relationship paths between two exact Files or Nodes.',
      inputSchema: z.object({
        ...workspaceProjectionFields,
        from: z.string().min(1),
        to: z.string().min(1),
        maxDepth: z.number().int().positive().default(6),
        maxPaths: z.number().int().positive().default(5),
      }),
      annotations: readOnlyAnnotations,
    },
    async input => execute(dependencies, createQueryCommand(input, dependencies, {
      report: 'paths',
      arguments: {
        from: input.from,
        to: input.to,
        maxDepth: input.maxDepth,
        maxPaths: input.maxPaths,
        expandFileSelectors: true,
        projectFileEndpoints: true,
      },
    })),
  );
}

export function createCodeGraphyMcpServer(
  dependencies: CodeGraphyMcpServerDependencies = DEFAULT_DEPENDENCIES,
): McpServer {
  const server = new McpServer(
    {
      name: 'codegraphy',
      version: '0.1.0',
    },
    {
      instructions: [
        'Use status before relying on cached Relationships when freshness matters.',
        'Use search or map to discover targets, then query for an exact overview.',
        'Every result includes metadata.cache freshness and metadata.result completeness.',
        'Index only when the user wants to change the workspace Graph Cache.',
      ].join(' '),
    },
  );
  registerWorkspaceTools(server, dependencies);
  registerDiscoveryTools(server, dependencies);
  registerInventoryTools(server, dependencies);
  registerNavigationTools(server, dependencies);
  return server;
}

type ServeCodeGraphyMcp = (createServer: () => McpServer) => unknown;

export async function runCodeGraphyMcpServer(
  serve: ServeCodeGraphyMcp = serveStdio,
): Promise<void> {
  await serve(() => createCodeGraphyMcpServer());
}
