import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { createCodeGraphyMcpServer } from '../../src/mcp/server';

async function connectServer(
  dependencies: Parameters<typeof createCodeGraphyMcpServer>[1],
) {
  const server = createCodeGraphyMcpServer({}, dependencies);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return client;
}

function createDependencies() {
  return {
    openRepo: async ({ repoPath }: { repoPath: string }) => ({
      repo: repoPath,
      graphCacheExists: true,
      message: 'opened',
    }),
    indexRepo: async ({ repo }: { repo: string }) => ({
      repo,
      graphCache: '.codegraphy/graph.lbug',
      message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
    }),
    runGraphQuery: async (input: { repo: string; report: string; arguments: Record<string, unknown> }) => ({
      report: input.report,
      repo: input.repo,
      arguments: input.arguments,
    }),
  };
}

describe('mcp/server', () => {
  it('registers the open, index, and graph query tools without the old status workflow', async () => {
    const client = await connectServer(createDependencies());

    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);

    expect(names).toEqual(expect.arrayContaining([
      'codegraphy_open_repo',
      'codegraphy_index_repo',
      'codegraphy_list_nodes',
      'codegraphy_list_edges',
      'codegraphy_list_relationships',
      'codegraphy_list_symbols',
      'codegraphy_find_paths',
    ]));
    expect(names).not.toEqual(expect.arrayContaining([
      'codegraphy_select_repo',
      'codegraphy_repo_status',
      'codegraphy_request_reindex',
      'codegraphy_file_dependencies',
      'codegraphy_explain_relationship',
      'codegraphy_view_graph',
    ]));
    expect(tools.tools.find((tool) => tool.name === 'codegraphy_index_repo')?.description).toContain(
      'Core Extension',
    );
  });

  it('opens a repo and uses it for later index and query calls', async () => {
    const calls: string[] = [];
    const client = await connectServer({
      openRepo: async ({ repoPath }) => {
        calls.push(`open:${repoPath}`);
        return { repo: '/workspace/project', graphCacheExists: false };
      },
      indexRepo: async ({ repo }) => {
        calls.push(`index:${repo}`);
        return {
          repo,
          graphCache: '.codegraphy/graph.lbug',
          message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
        };
      },
      runGraphQuery: async ({ repo, report, arguments: args }) => {
        calls.push(`query:${repo}:${report}`);
        return { nodes: [], page: { offset: 0, limit: 500, returned: 0, total: 0 }, args };
      },
    });

    await client.callTool({
      name: 'codegraphy_open_repo',
      arguments: { repo: '/workspace/project' },
    });
    const indexResult = await client.callTool({
      name: 'codegraphy_index_repo',
      arguments: {},
    });
    const queryResult = await client.callTool({
      name: 'codegraphy_list_nodes',
      arguments: { search: 'GraphQuery' },
    });

    expect(indexResult.structuredContent).toMatchObject({
      repo: '/workspace/project',
      graphCache: '.codegraphy/graph.lbug',
    });
    expect(queryResult.structuredContent).toMatchObject({
      nodes: [],
      args: { search: 'GraphQuery' },
    });
    expect(calls).toEqual([
      'open:/workspace/project',
      'index:/workspace/project',
      'query:/workspace/project:nodes',
    ]);
  });

  it('returns copy-paste guidance when a query runs before a repo is opened', async () => {
    const client = await connectServer(createDependencies());

    const result = await client.callTool({
      name: 'codegraphy_list_edges',
      arguments: {},
    });

    expect(result.structuredContent).toEqual({
      error: 'repo_not_open',
      message: 'Open a repo first with `codegraphy_open_repo({"repo":"/absolute/path/to/repo"})`.',
    });
  });
});
