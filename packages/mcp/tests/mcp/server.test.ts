import {
  Client,
  InMemoryTransport,
  type CallToolResult,
} from '@modelcontextprotocol/client';
import type {
  CodeGraphyWorkspaceCommand,
  CodeGraphyWorkspaceCommandResponse,
} from '@codegraphy-dev/core';
import { describe, expect, it, vi } from 'vitest';
import {
  createCodeGraphyMcpServer,
  runCodeGraphyMcpServer,
} from '../../src/mcp/server';

function createResponse(
  command: CodeGraphyWorkspaceCommand['command'],
): CodeGraphyWorkspaceCommandResponse {
  if (command === 'status') {
    return {
      ok: true,
      command,
      data: {
        workspaceRoot: '/workspace/project',
        graphCache: '.codegraphy/graph.sqlite',
        state: 'stale',
        hasGraphCache: true,
        staleReasons: ['pending-changed-files'],
        enabledPlugins: [],
        message: 'Graph Cache is stale.',
      },
      metadata: {
        workspaceRoot: '/workspace/project',
        cache: {
          state: 'stale',
          staleReasons: ['pending-changed-files'],
        },
        result: {
          complete: true,
          reasons: [],
        },
      },
    };
  }

  return {
    ok: true,
    command,
    data: {
      nodes: [],
      page: {
        offset: 0,
        limit: 20,
        returned: 0,
        total: 0,
        nextOffset: null,
      },
    },
    metadata: {
      workspaceRoot: '/workspace/project',
      cache: {
        state: 'fresh',
        staleReasons: [],
      },
      result: {
        complete: true,
        reasons: [],
      },
    },
  };
}

async function connectServer(executeWorkspaceCommand = vi.fn(
  async (command: CodeGraphyWorkspaceCommand) => createResponse(command.command),
)): Promise<{
  client: Client;
  executeWorkspaceCommand: typeof executeWorkspaceCommand;
}> {
  const server = createCodeGraphyMcpServer({
    cwd: () => '/workspace/project',
    executeWorkspaceCommand,
  });
  const client = new Client({
    name: 'codegraphy-mcp-test',
    version: '1.0.0',
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, executeWorkspaceCommand };
}

function structuredResponse(result: CallToolResult): CodeGraphyWorkspaceCommandResponse {
  return result.structuredContent as unknown as CodeGraphyWorkspaceCommandResponse;
}

describe('mcp/server', () => {
  it('serves a fresh CodeGraphy server for each stdio connection', async () => {
    const serve = vi.fn(async (createServer: () => unknown) => {
      expect(createServer()).toBeDefined();
    });

    await runCodeGraphyMcpServer(serve);

    expect(serve).toHaveBeenCalledOnce();
  });

  it('discovers the existing CodeGraphy workflow as typed MCP tools', async () => {
    const { client } = await connectServer();

    const result = await client.listTools();

    expect(result.tools.map(tool => tool.name)).toEqual([
      'codegraphy_status',
      'codegraphy_index',
      'codegraphy_search',
      'codegraphy_map',
      'codegraphy_query',
      'codegraphy_nodes',
      'codegraphy_edges',
      'codegraphy_dependencies',
      'codegraphy_dependents',
      'codegraphy_path',
    ]);
    expect(result.tools.find(tool => tool.name === 'codegraphy_search')).toMatchObject({
      annotations: {
        readOnlyHint: true,
      },
      inputSchema: {
        required: ['pattern'],
      },
    });
    expect(result.tools.find(tool => tool.name === 'codegraphy_index')).toMatchObject({
      annotations: {
        idempotentHint: true,
        readOnlyHint: false,
      },
    });
  });

  it('invokes Core directly and returns structured freshness and completeness', async () => {
    const { client, executeWorkspaceCommand } = await connectServer();

    const result = await client.callTool({
      name: 'codegraphy_status',
      arguments: {
        workspacePath: '/workspace/project',
      },
    });

    expect(executeWorkspaceCommand).toHaveBeenCalledWith({
      command: 'status',
      workspacePath: '/workspace/project',
    });
    expect(structuredResponse(result)).toMatchObject({
      ok: true,
      metadata: {
        cache: {
          state: 'stale',
          staleReasons: ['pending-changed-files'],
        },
        result: {
          complete: true,
          reasons: [],
        },
      },
    });
  });

  it('maps exploration tools one-to-one onto existing Core Graph Query reports', async () => {
    const { client, executeWorkspaceCommand } = await connectServer();

    await client.callTool({
      name: 'codegraphy_search',
      arguments: {
        pattern: 'workspace command',
        limit: 12,
      },
    });
    await client.callTool({
      name: 'codegraphy_dependencies',
      arguments: {
        target: 'src/app.ts',
      },
    });
    await client.callTool({
      name: 'codegraphy_path',
      arguments: {
        from: 'src/app.ts',
        to: 'src/model.ts',
      },
    });

    expect(executeWorkspaceCommand).toHaveBeenNthCalledWith(1, {
      command: 'query',
      workspacePath: '/workspace/project',
      query: {
        report: 'search',
        arguments: {
          pattern: 'workspace command',
          limit: 12,
        },
      },
    });
    expect(executeWorkspaceCommand).toHaveBeenNthCalledWith(2, {
      command: 'query',
      workspacePath: '/workspace/project',
      query: {
        report: 'edges',
        arguments: {
          from: 'src/app.ts',
          expandFileSelectors: true,
          projectFileEndpoints: true,
          limit: 100,
        },
      },
    });
    expect(executeWorkspaceCommand).toHaveBeenNthCalledWith(3, {
      command: 'query',
      workspacePath: '/workspace/project',
      query: {
        report: 'paths',
        arguments: {
          from: 'src/app.ts',
          to: 'src/model.ts',
          maxDepth: 6,
          maxPaths: 5,
          expandFileSelectors: true,
          projectFileEndpoints: true,
        },
      },
    });
  });

  it('returns Core command failures as MCP tool errors that clients can inspect', async () => {
    const failedResponse: CodeGraphyWorkspaceCommandResponse = {
      ok: false,
      command: 'query',
      error: {
        code: 'graph_cache_not_found',
        message: 'Run Indexing first.',
      },
      metadata: {
        workspaceRoot: '/workspace/project',
        cache: {
          state: 'missing',
          staleReasons: ['never-indexed'],
        },
        result: {
          complete: false,
          reasons: ['cache-missing'],
        },
      },
    };
    const { client } = await connectServer(vi.fn(async () => failedResponse));

    const result = await client.callTool({
      name: 'codegraphy_nodes',
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(structuredResponse(result)).toEqual(failedResponse);
  });
});
