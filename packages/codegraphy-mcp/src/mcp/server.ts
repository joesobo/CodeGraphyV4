import * as path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GraphEdgeKind } from '@codegraphy-vscode/plugin-api';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import { listRegisteredRepoStatuses, readRepoStatus } from '../repoStatus/read';
import { readFileDependencies } from '../query/fileDependencies';
import { readFileDependents } from '../query/fileDependents';
import { readFileSummary } from '../query/fileSummary';
import { readImpactSet } from '../query/impactSet';
import { MissingDatabaseError } from '../query/errors';
import { loadQueryContext } from '../query/load';
import { createFileNode } from '../query/indexes';
import { AmbiguousQueryFilePathError, resolveQueryFilePath, type ResolvedQueryFilePath } from '../query/pathResolver';
import { explainRelationship } from '../query/relationship';
import { readSymbolDependencies } from '../query/symbolDependencies';
import { readSymbolDependents } from '../query/symbolDependents';
import type { QueryContext, QueryOptions } from '../query/model';
import { requestCodeGraphyReindex, type ReindexRequestInput, type ReindexRequestResult } from '../reindex/request';
import { readViewGraph } from '../viewGraph/read';

const querySchema = {
  repo: z.string().optional(),
  direction: z.enum(['incoming', 'outgoing', 'both']).optional(),
  kinds: z.array(z.string()).optional(),
  maxDepth: z.number().int().positive().optional(),
  maxResults: z.number().int().positive().optional(),
};

interface SessionState {
  selectedRepo?: string;
}

interface CodeGraphyMcpServerDependencies {
  requestCodeGraphyReindex(input: ReindexRequestInput): Promise<ReindexRequestResult>;
}

const DEFAULT_DEPENDENCIES: CodeGraphyMcpServerDependencies = {
  requestCodeGraphyReindex,
};

function renderToolText(result: unknown): string {
  return JSON.stringify(result, null, 2);
}

function normalizeKinds(kinds?: string[]): GraphEdgeKind[] | undefined {
  return kinds?.map((kind) => kind as GraphEdgeKind);
}

function createQueryOptions(input: { direction?: 'incoming' | 'outgoing' | 'both'; kinds?: string[]; maxDepth?: number; maxResults?: number }): QueryOptions {
  return {
    direction: input.direction,
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

function createAmbiguousFilePathResult(repo: string, error: AmbiguousQueryFilePathError) {
  return {
    repo,
    nodes: error.candidates.map((candidate) => createFileNode(candidate)),
    edges: [],
    symbols: [],
    summary: {
      status: 'ambiguous-file-path',
      input: error.input,
      candidateCount: error.candidates.length,
      candidates: error.candidates,
    },
    limitations: [
      error.message,
    ],
  };
}

function createToolResult<T extends Record<string, unknown>>(result: T) {
  return {
    structuredContent: result,
    content: [{ type: 'text' as const, text: renderToolText(result) }],
  };
}

function withPathResolutionLimitations<T extends { limitations: string[] }>(
  result: T,
  ...resolvedPaths: ResolvedQueryFilePath[]
): T {
  const limitations = resolvedPaths.flatMap((resolvedPath) => resolvedPath.limitations);
  if (limitations.length === 0) {
    return result;
  }

  return {
    ...result,
    limitations: [
      ...result.limitations,
      ...limitations,
    ],
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

function isSymbolId(id: string, context: QueryContext): boolean {
  return id.startsWith('symbol:') || context.symbols.has(id);
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

    if (error instanceof AmbiguousQueryFilePathError) {
      return createToolResult(createAmbiguousFilePathResult(repo, error));
    }

    throw error;
  }
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
      description: 'Check whether a repo has a CodeGraphy database, whether it is registered locally, and whether the saved index is fresh or stale. Accepts absolute or relative paths such as `.`.',
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
    'codegraphy_request_reindex',
    {
      description: 'Ask the running CodeGraphy VS Code extension to reindex a repo. Use when CodeGraphy status is stale or missing before relying on graph queries. The request focuses VS Code with `code <repo>`, sends a repo-scoped CodeGraphy URI, and can wait until the saved DB reports fresh.',
      inputSchema: z.object({
        repo: z.string().optional(),
        wait: z.boolean().optional(),
        timeoutMs: z.number().int().positive().optional(),
        pollIntervalMs: z.number().int().positive().optional(),
      }),
    },
    async (input) => createToolResult(await dependencies.requestCodeGraphyReindex({
      repoPath: resolveRepo(input.repo, session),
      wait: input.wait,
      timeoutMs: input.timeoutMs,
      pollIntervalMs: input.pollIntervalMs,
    })),
  );

  server.registerTool(
    'codegraphy_file_dependencies',
    {
      description: 'List outgoing file dependencies from a file path. Accepts absolute paths, repo-relative paths, and unique suffixes like `src/a.ts` or `a.ts`. Prefer this before broad source-file search when planning code changes.',
      inputSchema: z.object({
        repo: querySchema.repo,
        filePath: z.string(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      const filePath = resolveQueryFilePath(input.filePath, repo, context);
      return withPathResolutionLimitations(
        readFileDependencies(filePath.filePath, context, createQueryOptions(input)),
        filePath,
      );
    }),
  );

  server.registerTool(
    'codegraphy_file_dependents',
    {
      description: 'List incoming file dependents for a file path. Accepts absolute paths, repo-relative paths, and unique suffixes like `src/a.ts` or `a.ts`. Use this first to find what may break or need updates after a change.',
      inputSchema: z.object({
        repo: querySchema.repo,
        filePath: z.string(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      const filePath = resolveQueryFilePath(input.filePath, repo, context);
      return withPathResolutionLimitations(
        readFileDependents(filePath.filePath, context, createQueryOptions(input)),
        filePath,
      );
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
      description: 'Return a bounded transitive impact set from a file path or symbol ID. File paths accept absolute paths, repo-relative paths, and unique suffixes like `src/a.ts` or `a.ts`. File seeds expand through declared symbols, and agents can filter by edge kinds to reduce noise before broad repo search.',
      inputSchema: z.object({
        repo: querySchema.repo,
        seed: z.string(),
        direction: querySchema.direction,
        kinds: querySchema.kinds,
        maxDepth: querySchema.maxDepth,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      if (isSymbolId(input.seed, context)) {
        return readImpactSet(input.seed, context, createQueryOptions(input));
      }

      const seed = resolveQueryFilePath(input.seed, repo, context);
      return withPathResolutionLimitations(
        readImpactSet(seed.filePath, context, createQueryOptions(input)),
        seed,
      );
    }),
  );

  server.registerTool(
    'codegraphy_explain_relationship',
    {
      description: 'Explain the direct or bounded path relationship between two file paths or symbol IDs. File paths accept absolute paths, repo-relative paths, and unique suffixes like `src/a.ts` or `a.ts`. Use this first for dependency and connection questions.',
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
      const from = isSymbolId(input.from, context)
        ? { filePath: input.from, limitations: [] }
        : resolveQueryFilePath(input.from, repo, context);
      const to = isSymbolId(input.to, context)
        ? { filePath: input.to, limitations: [] }
        : resolveQueryFilePath(input.to, repo, context);
      return withPathResolutionLimitations(
        explainRelationship({
          ...createQueryOptions(input),
          from: from.filePath,
          to: to.filePath,
        }, context),
        from,
        to,
      );
    }),
  );

  server.registerTool(
    'codegraphy_view_graph',
    {
      description: 'Project a saved CodeGraphy-style graph view from the repo DB and `.codegraphy/settings.json`, including depth mode, folder nodes, package nodes, and their structural edges. Focus accepts symbol IDs or file paths, including unique suffixes like `src/a.ts` or `a.ts`.',
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
      const focus = input.focus
        ? isSymbolId(input.focus, context)
          ? { filePath: input.focus, limitations: [] }
          : resolveQueryFilePath(input.focus, repo, context)
        : undefined;
      return withPathResolutionLimitations(
        readViewGraph(context, {
          focus: focus?.filePath,
          kinds: normalizeKinds(input.kinds),
          maxResults: input.maxResults,
          depthMode: input.depthMode,
          depthLimit: input.depthLimit,
          includeFolders: input.includeFolders,
          includePackages: input.includePackages,
          showOrphans: input.showOrphans,
        }),
        ...(focus ? [focus] : []),
      );
    }),
  );

  server.registerTool(
    'codegraphy_file_summary',
    {
      description: 'Summarize declared symbols and relation counts for one file path after CodeGraphy has narrowed the likely files to inspect. Accepts absolute paths, repo-relative paths, and unique suffixes like `src/a.ts` or `a.ts`.',
      inputSchema: z.object({
        repo: querySchema.repo,
        filePath: z.string(),
        kinds: querySchema.kinds,
        maxResults: querySchema.maxResults,
      }),
    },
    async (input) => runRepoQuery(input, session, (repo) => {
      const context = loadQueryContext(repo);
      const filePath = resolveQueryFilePath(input.filePath, repo, context);
      return withPathResolutionLimitations(
        readFileSummary(filePath.filePath, context, createQueryOptions(input)),
        filePath,
      );
    }),
  );

  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createCodeGraphyMcpServer();
  await server.connect(new StdioServerTransport());
}
