import * as fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCodeGraphyMcpServer } from '../../src/mcp/server';
import { appendRelationToRepo, createTempCodeGraphyHome, createTempRepo, writeRepoSettings } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('mcp/server', () => {
  let homePath: string;
  let originalHome: string | undefined;
  let originalCwd: string;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    originalCwd = process.cwd();
    homePath = createTempCodeGraphyHome();
    process.env.CODEGRAPHY_HOME = homePath;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env.CODEGRAPHY_HOME = originalHome;
    fs.rmSync(homePath, { recursive: true, force: true });
  });

  it('lists tools and queries a selected repo', async () => {
    const repo = createTempRepo(createSampleSnapshot());
    const server = createCodeGraphyMcpServer();
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
      'codegraphy_list_repos',
      'codegraphy_select_repo',
      'codegraphy_file_dependencies',
      'codegraphy_view_graph',
    ]));
    expect(tools.tools.find((tool) => tool.name === 'codegraphy_file_dependencies')?.description).toContain(
      'Prefer this before broad source-file search',
    );
    expect(tools.tools.find((tool) => tool.name === 'codegraphy_select_repo')?.description).toContain(
      'relative paths such as `.`',
    );
    expect(tools.tools.find((tool) => tool.name === 'codegraphy_view_graph')?.description).toContain(
      'depth mode, folder nodes, package nodes',
    );

    await client.callTool({
      name: 'codegraphy_select_repo',
      arguments: { repo: repo.workspaceRoot },
    });

    const result = await client.callTool({
      name: 'codegraphy_file_dependencies',
      arguments: { filePath: 'src/b.ts' },
    });

    expect(result.structuredContent).toMatchObject({
      summary: {
        filePath: 'src/b.ts',
        relatedFileCount: 1,
      },
    });
  });

  it('accepts a relative repo path when selecting the session repo', async () => {
    const repo = createTempRepo(createSampleSnapshot());
    process.chdir(repo.workspaceRoot);
    const resolvedWorkspaceRoot = process.cwd();
    const server = createCodeGraphyMcpServer();
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    await client.callTool({
      name: 'codegraphy_select_repo',
      arguments: { repo: '.' },
    });

    const result = await client.callTool({
      name: 'codegraphy_repo_status',
      arguments: {},
    });

    expect(result.structuredContent).toMatchObject({
      workspaceRoot: resolvedWorkspaceRoot,
      status: 'indexed',
    });
  });

  it('returns setup guidance instead of indexing a missing repo', async () => {
    const workspaceRoot = fs.mkdtempSync(`${homePath}/missing-repo-`);
    const server = createCodeGraphyMcpServer();
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: 'codegraphy_file_dependencies',
      arguments: { repo: workspaceRoot, filePath: 'src/b.ts' },
    });

    expect(result.structuredContent).toMatchObject({
      summary: {
        status: 'missing-db',
      },
    });
  });

  it('reloads the database on each query so saved graph changes are visible', async () => {
    const repo = createTempRepo(createSampleSnapshot());
    const server = createCodeGraphyMcpServer();
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await client.callTool({
      name: 'codegraphy_select_repo',
      arguments: { repo: repo.workspaceRoot },
    });

    const before = await client.callTool({
      name: 'codegraphy_file_dependents',
      arguments: { filePath: 'src/a.ts' },
    });

    expect(before.structuredContent).toMatchObject({
      summary: {
        relatedFileCount: 1,
      },
    });

    appendRelationToRepo(repo, {
      kind: 'type-import',
      sourceId: 'ts:type-import',
      fromFilePath: 'src/d.ts',
      toFilePath: 'src/a.ts',
      fromSymbolId: 'symbol:src/d.ts:typeUser',
      toSymbolId: 'symbol:src/a.ts:exportAsJson',
    });

    const after = await client.callTool({
      name: 'codegraphy_file_dependents',
      arguments: { filePath: 'src/a.ts' },
    });

    expect(after.structuredContent).toMatchObject({
      summary: {
        relatedFileCount: 2,
      },
    });
  });

  it('projects a saved CodeGraphy view graph through MCP', async () => {
    const repo = createTempRepo({
      symbols: [
        {
          id: 'symbol:packages/feature-depth/src/deep.ts:getDepthTarget',
          name: 'getDepthTarget',
          kind: 'function',
          filePath: 'packages/feature-depth/src/deep.ts',
        },
        {
          id: 'symbol:packages/feature-depth/src/leaf.ts:getLeafName',
          name: 'getLeafName',
          kind: 'function',
          filePath: 'packages/feature-depth/src/leaf.ts',
        },
      ],
      relations: [
        {
          kind: 'import',
          sourceId: 'ts:import',
          fromFilePath: 'packages/feature-depth/src/deep.ts',
          toFilePath: 'packages/feature-depth/src/leaf.ts',
          fromSymbolId: 'symbol:packages/feature-depth/src/deep.ts:getDepthTarget',
          toSymbolId: 'symbol:packages/feature-depth/src/leaf.ts:getLeafName',
        },
      ],
      files: [
        { filePath: 'package.json', mtime: 1, size: 1 },
        { filePath: 'packages/feature-depth/package.json', mtime: 1, size: 1 },
      ],
    });
    writeRepoSettings(repo, {
      showOrphans: false,
      nodeVisibility: {
        folder: true,
        package: true,
      },
    });
    const server = createCodeGraphyMcpServer();
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await client.callTool({
      name: 'codegraphy_select_repo',
      arguments: { repo: repo.workspaceRoot },
    });

    const result = await client.callTool({
      name: 'codegraphy_view_graph',
      arguments: {},
    });

    expect(result.structuredContent).toMatchObject({
      summary: {
        includeFolders: true,
        includePackages: true,
        edgeKindCounts: {
          import: 1,
          'codegraphy:nests': expect.any(Number),
        },
      },
    });
    expect((result.structuredContent as { nodes: Array<{ id: string }> }).nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(['packages', 'pkg:workspace:packages/feature-depth']),
    );
  });
});
