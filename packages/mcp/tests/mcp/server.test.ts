import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { createCodeGraphyMcpServer } from '../../src/mcp/server';

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

function createDependencies(): NonNullable<Parameters<typeof createCodeGraphyMcpServer>[0]> {
  return {
    cwd: () => '/workspace/project',
    statusWorkspace: async ({ workspacePath }: { workspacePath?: string }) => ({
      workspaceRoot: workspacePath ?? '/workspace/project',
      graphCache: '/workspace/project/.codegraphy/graph.lbug',
      state: 'fresh',
      hasGraphCache: true,
      staleReasons: [],
      enabledPlugins: ['@codegraphy/plugin-markdown'],
      message: 'CodeGraphy Workspace Graph Cache is fresh.',
    }),
    indexWorkspace: async ({ workspacePath }: { workspacePath?: string }) => ({
      workspaceRoot: workspacePath ?? '/workspace/project',
      graphCache: '.codegraphy/graph.lbug',
      message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
    }),
    runGraphQuery: async (input: { workspacePath?: string; report: string; arguments: Record<string, unknown> }) => ({
      report: input.report,
      workspaceRoot: input.workspacePath ?? '/workspace/project',
      arguments: input.arguments,
    }),
  };
}

describe('mcp/server', () => {
  it('registers path-first workspace tools without the selected-repo workflow', async () => {
    const client = await connectServer(createDependencies());

    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);

    expect(names).toEqual(expect.arrayContaining([
      'codegraphy_status',
      'codegraphy_index',
      'codegraphy_plugins_refresh',
      'codegraphy_plugins_add',
      'codegraphy_plugins_list',
      'codegraphy_plugins_enable',
      'codegraphy_plugins_disable',
      'codegraphy_list_nodes',
      'codegraphy_list_edges',
      'codegraphy_list_relationships',
      'codegraphy_list_symbols',
      'codegraphy_find_paths',
    ]));
    expect(names).not.toEqual(expect.arrayContaining([
      'codegraphy_open_repo',
      'codegraphy_index_repo',
      'codegraphy_select_repo',
      'codegraphy_request_reindex',
      'codegraphy_view_graph',
    ]));
    expect(tools.tools.find((tool) => tool.name === 'codegraphy_index')?.description).toContain(
      'CodeGraphy Workspace',
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

    await client.callTool({ name: 'codegraphy_plugins_refresh', arguments: {} });
    await client.callTool({
      name: 'codegraphy_plugins_add',
      arguments: { packageName: '@codegraphy/plugin-python' },
    });
    await client.callTool({
      name: 'codegraphy_plugins_list',
      arguments: { path: '/workspace/project' },
    });
    const enableResult = await client.callTool({
      name: 'codegraphy_plugins_enable',
      arguments: { packageName: '@codegraphy/plugin-python', path: '/workspace/project' },
    });
    await client.callTool({
      name: 'codegraphy_plugins_disable',
      arguments: { packageName: '@codegraphy/plugin-python', path: '/workspace/project' },
    });

    expect(enableResult.structuredContent).toEqual({
      exitCode: 0,
      output: 'ran enable',
    });
    expect(calls).toEqual([
      { name: 'plugins', action: 'refresh' },
      { name: 'plugins', action: 'add', packageName: '@codegraphy/plugin-python' },
      { name: 'plugins', action: 'list', workspacePath: '/workspace/project' },
      {
        name: 'plugins',
        action: 'enable',
        packageName: '@codegraphy/plugin-python',
        workspacePath: '/workspace/project',
      },
      {
        name: 'plugins',
        action: 'disable',
        packageName: '@codegraphy/plugin-python',
        workspacePath: '/workspace/project',
      },
    ]);
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
