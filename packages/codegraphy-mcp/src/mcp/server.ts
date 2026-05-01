import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import {
  requestCodeGraphyIndexRepo,
} from '../coreExtension/indexing';
import type {
  GraphQueryInput,
  GraphQueryReport,
  GraphQueryResult,
  IndexRepoInput,
  IndexRepoResult,
  OpenRepoInput,
  OpenRepoResult,
  ToolErrorResult,
} from '../coreExtension/model';
import { requestCodeGraphyOpenRepo } from '../coreExtension/open';
import { requestGraphQuery } from '../coreExtension/query';

interface SessionState {
  activeRepo?: string;
}

interface CodeGraphyMcpServerDependencies {
  openRepo(input: OpenRepoInput): Promise<OpenRepoResult | ToolErrorResult> | OpenRepoResult | ToolErrorResult;
  indexRepo(input: IndexRepoInput): Promise<IndexRepoResult | ToolErrorResult>;
  runGraphQuery(input: GraphQueryInput): Promise<GraphQueryResult>;
}

const DEFAULT_DEPENDENCIES: CodeGraphyMcpServerDependencies = {
  openRepo: requestCodeGraphyOpenRepo,
  indexRepo: requestCodeGraphyIndexRepo,
  runGraphQuery: requestGraphQuery,
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
const listQuerySchema = {
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

function createRepoNotOpenResult(): ToolErrorResult {
  return {
    error: 'repo_not_open',
    message: 'Open a repo first with `codegraphy_open_repo({"repo":"/absolute/path/to/repo"})`.',
  };
}

function isToolError(result: Record<string, unknown>): result is ToolErrorResult {
  return typeof result.error === 'string';
}

function registerGraphQueryTool(
  server: McpServer,
  session: SessionState,
  dependencies: CodeGraphyMcpServerDependencies,
  report: GraphQueryReport,
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
      if (!session.activeRepo) {
        return createToolResult(createRepoNotOpenResult());
      }

      return createToolResult(await dependencies.runGraphQuery({
        repo: session.activeRepo,
        report,
        arguments: input,
      }));
    },
  );
}

export function createCodeGraphyMcpServer(
  session: SessionState = {},
  dependencies: CodeGraphyMcpServerDependencies = DEFAULT_DEPENDENCIES,
): McpServer {
  const server = new McpServer({
    name: 'codegraphy',
    version: '0.1.0',
  });

  server.registerTool(
    'codegraphy_open_repo',
    {
      description: 'Open or focus a repo in VS Code and establish the active CodeGraphy Core Extension connection.',
      inputSchema: z.object({
        repo: z.string(),
      }),
    },
    async ({ repo }) => {
      const result = await dependencies.openRepo({ repoPath: repo });
      if (!isToolError(result)) {
        session.activeRepo = result.repo;
      }

      return createToolResult(result);
    },
  );

  server.registerTool(
    'codegraphy_index_repo',
    {
      description: 'Ask the active CodeGraphy Core Extension to run Indexing for the open repo. Large repos can take some time.',
      inputSchema: z.object({}),
    },
    async () => {
      if (!session.activeRepo) {
        return createToolResult(createRepoNotOpenResult());
      }

      return createToolResult(await dependencies.indexRepo({ repo: session.activeRepo }));
    },
  );

  registerGraphQueryTool(
    server,
    session,
    dependencies,
    'nodes',
    'codegraphy_list_nodes',
    'List indexed Relationship Graph nodes. Defaults to File Nodes; folders and packages are included through Graph Scope.',
    {
      ...listQuerySchema,
      showOrphans: z.boolean().optional(),
    },
  );

  registerGraphQueryTool(
    server,
    session,
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
    session,
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
    session,
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
    session,
    dependencies,
    'paths',
    'codegraphy_find_paths',
    'Return bounded directed node paths from one exact node path to another. Paths contain nodes only.',
    {
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
