import * as path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GraphEdgeKind } from '@codegraphy-vscode/plugin-api';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import { toRepoRelativeFilePath } from '../database/paths';
import { listRegisteredRepoStatuses, readRepoStatus } from '../repoStatus/read';
import { readFileDependencies } from '../query/fileDependencies';
import { readFileDependents } from '../query/fileDependents';
import { readFileSummary } from '../query/fileSummary';
import { readImpactSet } from '../query/impactSet';
import { MissingDatabaseError } from '../query/errors';
import { loadQueryContext } from '../query/load';
import { explainRelationship } from '../query/relationship';
import { readSymbolDependencies } from '../query/symbolDependencies';
import { readSymbolDependents } from '../query/symbolDependents';
import type { QueryOptions } from '../query/model';
import { readViewGraph } from '../viewGraph/read';

const querySchema = {
  repo: z.string().optional(),
  kinds: z.array(z.string()).optional(),
  maxDepth: z.number().int().positive().optional(),
  maxResults: z.number().int().positive().optional(),
};

interface SessionState {
  selectedRepo?: string;
}

function renderToolText(result: unknown): string {
  return JSON.stringify(result, null, 2);
}

function normalizeKinds(kinds?: string[]): GraphEdgeKind[] | undefined {
  return kinds?.map((kind) => kind as GraphEdgeKind);
}

function createQueryOptions(input: { kinds?: string[]; maxDepth?: number; maxResults?: number }): QueryOptions {
  return {
    kinds: normalizeKinds(input.kinds),
    maxDepth: input.maxDepth,
    maxResults: input.maxResults,
  };
}

function createMissingDatabaseResult(error: MissingDatabaseError) {
  return {
    repo: error.workspaceRoot,
    nodes: [],
    edges: [],
    symbols: [],
    summary: {
      status: 'missing-db',
      databasePath: error.databasePath,
    },
    limitations: [error.message],
  };
}

function createToolResult<T extends Record<string, unknown>>(result: T) {
  return {
    structuredContent: result,
    content: [{ type: 'text' as const, text: renderToolText(result) }],
  };
}

function resolveRepo(
  repoPath: string | undefined,
  session: SessionState,
): string {
  if (repoPath) {
    return path.resolve(repoPath);
  }

  if (session.selectedRepo) {
    return session.selectedRepo;
  }

  const cwdStatus = readRepoStatus(process.cwd());
  if (cwdStatus.registered) {
    return cwdStatus.workspaceRoot;
  }

  throw new Error('No CodeGraphy repo selected. Pass `repo` or call `codegraphy_select_repo` first.');
}

function normalizeFilePath(filePath: string, repo: string): string {
  return toRepoRelativeFilePath(filePath, repo);
}

async function runRepoQuery<TInput extends { repo?: string }>(
  input: TInput,
  session: SessionState,
  query: (repo: string) => Record<string, unknown>,
) {
  const repo = resolveRepo(input.repo, session);

  try {
    return createToolResult(query(repo));
  } catch (error) {
    if (error instanceof MissingDatabaseError) {
      return createToolResult(createMissingDatabaseResult(error));
    }

    throw error;
  }
}

export function createCodeGraphyMcpServer(session: SessionState = {}): McpServer {
  const server = new McpServer({
    name: 'codegraphy',
    version: '0.1.0',
  });

  server.registerTool(
    'codegraphy_list_repos',
    {
      description: 'List locally known CodeGraphy repos. Use this first when the target repo is unclear before broad file search.',
      inputSchema: z.object({}),
    },
    async () => {
      const repos = listRegisteredRepoStatuses();
      return {
        structuredContent: { repos },
        content: [{ type: 'text', text: renderToolText({ repos }) }],
      };
    },
  );

  server.registerTool(
    'codegraphy_select_repo',
    {
      description: 'Select the repo for later CodeGraphy MCP queries in this session. Accepts absolute or relative paths such as `.`.',
      inputSchema: z.object({
        repo: z.string(),
      }),
    },
    async ({ repo }) => {
      session.selectedRepo = path.resolve(repo);
      const status = readRepoStatus(session.selectedRepo);
      return {
        structuredContent: status,
        content: [{ type: 'text', text: renderToolText(status) }],
      };
    },
  );

  server.registerTool(
    'codegraphy_repo_status',
    {
      description: 'Check whether a repo has a CodeGraphy database and whether it is registered locally. Accepts absolute or relative paths such as `.`.',
      inputSchema: z.object({
        repo: z.string().optional(),
      }),
    },
    async ({ repo }) => {
      const status = readRepoStatus(resolveRepo(repo, session));
      return {
        structuredContent: status,
        content: [{ type: 'text', text: renderToolText(status) }],
      };
    },
  );

  server.registerTool(
    'codegraphy_file_dependencies',
    {
      description: 'List outgoing file dependencies from a repo-relative file path. Prefer this before broad source-file search when planning code changes.',
      inputSchema: z.object({
        repo: querySchema.repo,
        filePath: z.string(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      return readFileDependencies(normalizeFilePath(input.filePath, repo), context, createQueryOptions(input));
    }),
  );

  server.registerTool(
    'codegraphy_file_dependents',
    {
      description: 'List incoming file dependents for a repo-relative file path. Use this first to find what may break or need updates after a change.',
      inputSchema: z.object({
        repo: querySchema.repo,
        filePath: z.string(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      return readFileDependents(normalizeFilePath(input.filePath, repo), context, createQueryOptions(input));
    }),
  );

  server.registerTool(
    'codegraphy_symbol_dependencies',
    {
      description: 'List outgoing relations for a CodeGraphy symbol ID. Use this before reading many files when tracing a symbol outward.',
      inputSchema: z.object({
        repo: querySchema.repo,
        symbolId: z.string(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      return readSymbolDependencies(input.symbolId, context, createQueryOptions(input));
    }),
  );

  server.registerTool(
    'codegraphy_symbol_dependents',
    {
      description: 'List incoming relations for a CodeGraphy symbol ID. Use this first for symbol-level impact analysis before editing.',
      inputSchema: z.object({
        repo: querySchema.repo,
        symbolId: z.string(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      return readSymbolDependents(input.symbolId, context, createQueryOptions(input));
    }),
  );

  server.registerTool(
    'codegraphy_impact_set',
    {
      description: 'Return a bounded transitive impact set from a file path or symbol ID. Prefer this before broad repo search when scoping a change.',
      inputSchema: z.object({
        repo: querySchema.repo,
        seed: z.string(),
        kinds: querySchema.kinds,
        maxDepth: querySchema.maxDepth,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      const seed = input.seed.startsWith('symbol:')
        ? input.seed
        : normalizeFilePath(input.seed, repo);
      return readImpactSet(seed, context, createQueryOptions(input));
    }),
  );

  server.registerTool(
    'codegraphy_explain_relationship',
    {
      description: 'Explain the direct or bounded path relationship between two file paths or symbol IDs. Use this first for dependency and connection questions.',
      inputSchema: z.object({
        repo: querySchema.repo,
        from: z.string(),
        to: z.string(),
        kinds: querySchema.kinds,
        maxDepth: querySchema.maxDepth,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      return explainRelationship({
        ...createQueryOptions(input),
        from: input.from.startsWith('symbol:') ? input.from : normalizeFilePath(input.from, repo),
        to: input.to.startsWith('symbol:') ? input.to : normalizeFilePath(input.to, repo),
      }, context);
    }),
  );

  server.registerTool(
    'codegraphy_view_graph',
    {
      description: 'Project a saved CodeGraphy-style graph view from the repo DB and `.codegraphy/settings.json`, including depth mode, folder nodes, package nodes, and their structural edges.',
      inputSchema: z.object({
        repo: querySchema.repo,
        focus: z.string().optional(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
        depthMode: z.boolean().optional(),
        depthLimit: z.number().int().positive().optional(),
        includeFolders: z.boolean().optional(),
        includePackages: z.boolean().optional(),
        showOrphans: z.boolean().optional(),
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      return readViewGraph(context, {
        focus: input.focus?.startsWith('symbol:')
          ? input.focus
          : input.focus
            ? normalizeFilePath(input.focus, repo)
            : undefined,
        kinds: normalizeKinds(input.kinds),
        maxResults: input.maxResults,
        depthMode: input.depthMode,
        depthLimit: input.depthLimit,
        includeFolders: input.includeFolders,
        includePackages: input.includePackages,
        showOrphans: input.showOrphans,
      });
    }),
  );

  server.registerTool(
    'codegraphy_file_summary',
    {
      description: 'Summarize declared symbols and relation counts for one repo-relative file path after CodeGraphy has narrowed the likely files to inspect.',
      inputSchema: z.object({
        repo: querySchema.repo,
        filePath: z.string(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      return readFileSummary(normalizeFilePath(input.filePath, repo), context, createQueryOptions(input));
    }),
  );

  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createCodeGraphyMcpServer();
  await server.connect(new StdioServerTransport());
}
