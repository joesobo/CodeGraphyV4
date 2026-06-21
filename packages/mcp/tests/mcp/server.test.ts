import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createCodeGraphyMcpServer, runMcpServer } from '../../src/mcp/server';
import { splitWorkspacePath } from '../../src/mcp/workspacePath';

type MockedStdioTransport = {
  start: () => Promise<void>;
  send: () => Promise<void>;
  close: () => Promise<void>;
};

const stdioTransportState = vi.hoisted(() => ({
  transports: [] as MockedStdioTransport[],
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: unknown) => void;
    start = vi.fn(async () => {});
    send = vi.fn(async () => {});
    close = vi.fn(async () => {});

    constructor() {
      stdioTransportState.transports.push(this);
    }
  },
}));

async function connectServer(
  dependencies: Parameters<typeof createCodeGraphyMcpServer>[0],
) {
  const server = createCodeGraphyMcpServer(dependencies);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return client;
}

function createDependencies(
  workspaceRoot = '/workspace/project',
): NonNullable<Parameters<typeof createCodeGraphyMcpServer>[0]> {
  return {
    cwd: () => workspaceRoot,
    statusWorkspace: async ({ workspacePath }: { workspacePath?: string }) => ({
      workspaceRoot: workspacePath ?? workspaceRoot,
      graphCache: `${workspacePath ?? workspaceRoot}/.codegraphy/graph.lbug`,
      state: 'fresh',
      hasGraphCache: true,
      staleReasons: [],
      enabledPlugins: ['codegraphy.markdown'],
      message: 'CodeGraphy Workspace Graph Cache is fresh.',
    }),
    indexWorkspace: async ({ workspacePath }: { workspacePath?: string }) => ({
      workspaceRoot: workspacePath ?? workspaceRoot,
      graphCache: '.codegraphy/graph.lbug',
      message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
    }),
    runGraphQuery: async (input: { workspacePath?: string; report: string; arguments: Record<string, unknown> }) => ({
      report: input.report,
      workspaceRoot: input.workspacePath ?? workspaceRoot,
      arguments: input.arguments,
    }),
  };
}

type ListedTools = Awaited<ReturnType<Client['listTools']>>;
type ListedTool = ListedTools['tools'][number];

function findTool(tools: ListedTools, name: string): ListedTool {
  const tool = tools.tools.find((candidate) => candidate.name === name);
  expect(tool).toBeDefined();
  return tool as ListedTool;
}

function propertiesFor(tool: ListedTool): Record<string, Record<string, unknown>> {
  return (tool.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
}

describe('mcp/server', () => {
  it('connects the stdio runtime transport for the package entrypoint', async () => {
    stdioTransportState.transports = [];

    await runMcpServer();

    expect(stdioTransportState.transports).toHaveLength(1);
    expect(stdioTransportState.transports[0]?.start).toHaveBeenCalledTimes(1);
  });

  it('registers the path-first workspace tools', async () => {
    const client = await connectServer(createDependencies());

    expect(client.getServerVersion()).toEqual({
      name: 'codegraphy',
      version: '0.1.0',
    });

    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);

    expect(names).toEqual([
      'codegraphy_status',
      'codegraphy_index',
      'codegraphy_plugins_register',
      'codegraphy_plugins_list',
      'codegraphy_plugins_enable',
      'codegraphy_plugins_disable',
      'codegraphy_list_nodes',
      'codegraphy_list_edges',
      'codegraphy_list_relationships',
      'codegraphy_list_symbols',
      'codegraphy_find_paths',
    ]);
    expect(findTool(tools, 'codegraphy_status').description).toBe(
      'Report CodeGraphy Workspace status for the current folder or an explicit path.',
    );
    expect(findTool(tools, 'codegraphy_index').description).toBe(
      'Run Indexing for the current or explicit CodeGraphy Workspace path without focusing VS Code.',
    );
  });

  it('exposes plugin tools with the same path-first command shape as the CLI', async () => {
    const calls: unknown[] = [];
    const client = await connectServer({
      ...createDependencies(),
      runPluginsCommand: async (command) => {
        calls.push(command);
        return {
          exitCode: 0,
          output: `ran ${command.action}`,
        };
      },
    });

    await client.callTool({
      name: 'codegraphy_plugins_register',
      arguments: { packageName: '@codegraphy-dev/plugin-vue' },
    });
    await client.callTool({
      name: 'codegraphy_plugins_list',
      arguments: { path: '/workspace/project' },
    });
    const enableResult = await client.callTool({
      name: 'codegraphy_plugins_enable',
      arguments: { pluginId: 'codegraphy.vue', path: '/workspace/project' },
    });
    await client.callTool({
      name: 'codegraphy_plugins_disable',
      arguments: { pluginId: 'codegraphy.vue', path: '/workspace/project' },
    });

    expect(enableResult.structuredContent).toEqual({
      exitCode: 0,
      output: 'ran enable',
    });
    expect(enableResult.content).toEqual([{
      type: 'text',
      text: JSON.stringify({
        exitCode: 0,
        output: 'ran enable',
      }, null, 2),
    }]);
    expect(calls).toEqual([
      { name: 'plugins', action: 'register', packageName: '@codegraphy-dev/plugin-vue' },
      { name: 'plugins', action: 'list', workspacePath: '/workspace/project' },
      {
        name: 'plugins',
        action: 'enable',
        packageName: 'codegraphy.vue',
        workspacePath: '/workspace/project',
      },
      {
        name: 'plugins',
        action: 'disable',
        packageName: 'codegraphy.vue',
        workspacePath: '/workspace/project',
      },
    ]);
  });

  it('describes plugin tool scope, package registration, and plugin activity inputs explicitly', async () => {
    const client = await connectServer(createDependencies());
    const tools = await client.listTools();

    const registerTool = findTool(tools, 'codegraphy_plugins_register');
    const listTool = findTool(tools, 'codegraphy_plugins_list');
    const enableTool = findTool(tools, 'codegraphy_plugins_enable');
    const disableTool = findTool(tools, 'codegraphy_plugins_disable');

    expect(registerTool.description).toBe(
      'Register an explicitly named globally installed CodeGraphy plugin package in ~/.codegraphy/plugins.json.',
    );
    expect(listTool.description).toBe(
      'List registered plugins and which ones are enabled for the current or explicit CodeGraphy Workspace.',
    );
    expect(enableTool.description).toBe(
      'Enable a registered Plugin ID for the current or explicit CodeGraphy Workspace.',
    );
    expect(disableTool.description).toBe(
      'Disable a Plugin ID for the current or explicit CodeGraphy Workspace.',
    );
    expect(registerTool.inputSchema.required).toEqual(['packageName']);
    expect(propertiesFor(registerTool).packageName).toMatchObject({
      type: 'string',
      minLength: 1,
    });
    expect(enableTool.inputSchema.required).toEqual(['pluginId']);
    expect(disableTool.inputSchema.required).toEqual(['pluginId']);
    expect(propertiesFor(enableTool).pluginId).toMatchObject({
      type: 'string',
      minLength: 1,
    });
  });

  it('accepts verbose diagnostics on every MCP tool schema', async () => {
    const client = await connectServer(createDependencies());
    const tools = await client.listTools();

    for (const tool of tools.tools) {
      expect(propertiesFor(tool).verboseDiagnostics).toMatchObject({
        type: 'boolean',
      });
    }
  });

  it('falls back to the core plugin command runner with the dependency cwd', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-mcp-plugin-list-'));
    const client = await connectServer(createDependencies(workspaceRoot));

    const result = await client.callTool({
      name: 'codegraphy_plugins_list',
      arguments: {},
    });

    expect(result.structuredContent).toMatchObject({
      exitCode: 0,
    });
    expect(String((result.structuredContent as { output?: unknown }).output)).toContain(
      `CodeGraphy plugins for ${workspaceRoot}`,
    );
  });

  it('indexes and queries the current workspace without an open call', async () => {
    const calls: string[] = [];
    const client = await connectServer({
      ...createDependencies(),
      indexWorkspace: async ({ workspacePath }) => {
        calls.push(`index:${workspacePath ?? 'cwd'}`);
        return {
          workspaceRoot: workspacePath ?? '/workspace/project',
          graphCache: '.codegraphy/graph.lbug',
          message: 'indexed',
        };
      },
      runGraphQuery: async ({ workspacePath, report, arguments: args }) => {
        calls.push(`query:${workspacePath ?? 'cwd'}:${report}`);
        return { nodes: [], page: { offset: 0, limit: 500, returned: 0, total: 0 }, args };
      },
    });

    const indexResult = await client.callTool({
      name: 'codegraphy_index',
      arguments: {},
    });
    const queryResult = await client.callTool({
      name: 'codegraphy_list_nodes',
      arguments: { search: 'GraphQuery' },
    });

    expect(indexResult.structuredContent).toMatchObject({
      workspaceRoot: '/workspace/project',
      graphCache: '.codegraphy/graph.lbug',
    });
    expect(queryResult.structuredContent).toMatchObject({
      nodes: [],
      args: { search: 'GraphQuery' },
    });
    expect(calls).toEqual([
      'index:/workspace/project',
      'query:/workspace/project:nodes',
    ]);
  });

  it('describes graph query tools with their report-specific filters', async () => {
    const client = await connectServer(createDependencies());
    const tools = await client.listTools();

    expect(findTool(tools, 'codegraphy_list_nodes').description).toBe(
      'List indexed Relationship Graph nodes for a CodeGraphy Workspace. Defaults to File Nodes; folders and packages are included through Graph Scope.',
    );
    expect(propertiesFor(findTool(tools, 'codegraphy_list_nodes')).showOrphans).toMatchObject({
      type: 'boolean',
    });
    expect(findTool(tools, 'codegraphy_list_edges').description).toBe(
      'List high-level node connections with grouped Edge Types. Broad calls are paginated.',
    );
    expect(propertiesFor(findTool(tools, 'codegraphy_list_edges'))).toMatchObject({
      from: { type: 'string' },
      to: { type: 'string' },
      edgeType: { type: 'string' },
    });
    expect(findTool(tools, 'codegraphy_list_relationships').description).toBe(
      'List detailed Relationships grouped by node pair and Edge Type. Broad calls can be large and are paginated.',
    );
    expect(propertiesFor(findTool(tools, 'codegraphy_list_relationships'))).toMatchObject({
      from: { type: 'string' },
      to: { type: 'string' },
      edgeType: { type: 'string' },
    });
    expect(findTool(tools, 'codegraphy_list_symbols').description).toBe(
      'List symbol declarations or Relationship-backed symbol evidence. Broad calls can be large and are paginated.',
    );
    expect(propertiesFor(findTool(tools, 'codegraphy_list_symbols'))).toMatchObject({
      filePath: { type: 'string' },
      relatedFrom: { type: 'string' },
      relatedTo: { type: 'string' },
      edgeType: { type: 'string' },
    });
    const pathsTool = findTool(tools, 'codegraphy_find_paths');
    expect(pathsTool.description).toBe(
      'Return bounded directed node paths from one exact node path to another. Paths contain nodes only.',
    );
    expect(pathsTool.inputSchema.required).toEqual(['from', 'to']);
    expect(propertiesFor(pathsTool)).toMatchObject({
      from: { type: 'string' },
      to: { type: 'string' },
      maxDepth: { type: 'integer', exclusiveMinimum: 0 },
      maxPaths: { type: 'integer', exclusiveMinimum: 0 },
    });
  });

  it('passes the graph query report id for each report-specific tool', async () => {
    const calls: Array<{ report: string; arguments: Record<string, unknown> }> = [];
    const client = await connectServer({
      ...createDependencies(),
      runGraphQuery: async ({ report, arguments: args }) => {
        calls.push({ report, arguments: args });
        return { report, arguments: args };
      },
    });

    await client.callTool({
      name: 'codegraphy_list_edges',
      arguments: { from: 'src/a.ts', to: 'src/b.ts', edgeType: 'Imports' },
    });
    await client.callTool({
      name: 'codegraphy_list_symbols',
      arguments: {
        filePath: 'src/a.ts',
        relatedFrom: 'src/a.ts',
        relatedTo: 'src/b.ts',
        edgeType: 'Calls',
      },
    });
    await client.callTool({
      name: 'codegraphy_find_paths',
      arguments: { from: 'src/a.ts', to: 'src/b.ts', maxDepth: 2, maxPaths: 3 },
    });

    expect(calls).toEqual([
      {
        report: 'edges',
        arguments: { from: 'src/a.ts', to: 'src/b.ts', edgeType: 'Imports' },
      },
      {
        report: 'symbols',
        arguments: {
          filePath: 'src/a.ts',
          relatedFrom: 'src/a.ts',
          relatedTo: 'src/b.ts',
          edgeType: 'Calls',
        },
      },
      {
        report: 'paths',
        arguments: { from: 'src/a.ts', to: 'src/b.ts', maxDepth: 2, maxPaths: 3 },
      },
    ]);
  });

  it('splits non-string path values out of graph query arguments without using them as a workspace', () => {
    expect(splitWorkspacePath({
      path: 42,
      search: 'GraphQuery',
    })).toEqual({
      workspacePath: undefined,
      arguments: { search: 'GraphQuery' },
    });
    expect(splitWorkspacePath({
      path: '/workspace/other',
      search: 'GraphQuery',
    })).toEqual({
      workspacePath: '/workspace/other',
      arguments: { search: 'GraphQuery' },
    });
  });

  it('passes explicit workspace paths through status, index, and query tools', async () => {
    const calls: string[] = [];
    const client = await connectServer({
      ...createDependencies(),
      statusWorkspace: async ({ workspacePath }) => {
        calls.push(`status:${workspacePath}`);
        return {
          workspaceRoot: workspacePath ?? '/workspace/project',
          graphCache: `${workspacePath}/.codegraphy/graph.lbug`,
          state: 'fresh',
          hasGraphCache: true,
          staleReasons: [],
          enabledPlugins: [],
          message: 'fresh',
        };
      },
      indexWorkspace: async ({ workspacePath }) => {
        calls.push(`index:${workspacePath}`);
        return {
          workspaceRoot: workspacePath ?? '/workspace/project',
          graphCache: '.codegraphy/graph.lbug',
          message: 'indexed',
        };
      },
      runGraphQuery: async ({ workspacePath, report }) => {
        calls.push(`query:${workspacePath}:${report}`);
        return { relationships: [] };
      },
    });

    await client.callTool({ name: 'codegraphy_status', arguments: { path: '/workspace/other' } });
    await client.callTool({ name: 'codegraphy_index', arguments: { path: '/workspace/other' } });
    await client.callTool({ name: 'codegraphy_list_relationships', arguments: { path: '/workspace/other' } });

    expect(calls).toEqual([
      'status:/workspace/other',
      'index:/workspace/other',
      'query:/workspace/other:relationships',
    ]);
  });

  it('returns verbose diagnostics when MCP tools request them', async () => {
    const client = await connectServer({
      ...createDependencies(),
      statusWorkspace: async ({ diagnostics, workspacePath }) => {
        diagnostics?.emit({
          area: 'workspace',
          event: 'status-read',
          context: { workspaceRoot: workspacePath ?? '/workspace/project', state: 'fresh' },
        });
        return {
          workspaceRoot: workspacePath ?? '/workspace/project',
          graphCache: '.codegraphy/graph.lbug',
          state: 'fresh',
          hasGraphCache: true,
          staleReasons: [],
          enabledPlugins: [],
          message: 'fresh',
        };
      },
      runGraphQuery: async ({ diagnostics, report }) => {
        diagnostics?.emit({
          area: 'graph-query',
          event: 'completed',
          context: { report, nodeCount: 0 },
        });
        return { nodes: [] };
      },
    });

    const statusResult = await client.callTool({
      name: 'codegraphy_status',
      arguments: { verboseDiagnostics: true },
    });
    const queryResult = await client.callTool({
      name: 'codegraphy_list_nodes',
      arguments: { verboseDiagnostics: true },
    });

    expect(statusResult.structuredContent).toMatchObject({
      workspaceRoot: '/workspace/project',
      diagnostics: [{
        area: 'workspace',
        event: 'status-read',
        context: { workspaceRoot: '/workspace/project', state: 'fresh' },
      }],
    });
    expect(queryResult.structuredContent).toMatchObject({
      nodes: [],
      diagnostics: [{
        area: 'graph-query',
        event: 'completed',
        context: { report: 'nodes', nodeCount: 0 },
      }],
    });
  });

  it('returns missing Graph Cache guidance from query tools without focusing VS Code', async () => {
    const client = await connectServer({
      ...createDependencies(),
      runGraphQuery: async () => ({
        error: 'graph_cache_not_found',
        message: 'This CodeGraphy Workspace has not been indexed. Run `codegraphy_index`, then retry.',
      }),
    });

    const result = await client.callTool({
      name: 'codegraphy_list_edges',
      arguments: {},
    });

    expect(result.structuredContent).toEqual({
      error: 'graph_cache_not_found',
      message: 'This CodeGraphy Workspace has not been indexed. Run `codegraphy_index`, then retry.',
    });
  });
});
