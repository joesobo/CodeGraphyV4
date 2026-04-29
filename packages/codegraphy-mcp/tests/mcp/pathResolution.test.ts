import * as fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSnapshot } from '../../src/database/model';
import { createCodeGraphyMcpServer } from '../../src/mcp/server';
import { createTempCodeGraphyHome, createTempRepo } from '../support/database';

function createNestedDepthSnapshot(): DatabaseSnapshot {
  return {
    files: [],
    symbols: [
      {
        id: 'symbol:example-typescript/packages/feature-depth/src/deep.ts:function:getDepthTarget',
        name: 'getDepthTarget',
        kind: 'function',
        filePath: 'example-typescript/packages/feature-depth/src/deep.ts',
      },
      {
        id: 'symbol:example-typescript/packages/feature-depth/src/branch.ts:function:getBranchTarget',
        name: 'getBranchTarget',
        kind: 'function',
        filePath: 'example-typescript/packages/feature-depth/src/branch.ts',
      },
    ],
    relations: [
      {
        kind: 'import',
        sourceId: 'ts:import',
        fromFilePath: 'example-typescript/packages/feature-depth/src/deep.ts',
        toFilePath: 'example-typescript/packages/feature-depth/src/branch.ts',
        toSymbolId: 'symbol:example-typescript/packages/feature-depth/src/branch.ts:function:getBranchTarget',
        specifier: './branch',
      },
      {
        kind: 'call',
        sourceId: 'ts:call',
        fromFilePath: 'example-typescript/packages/feature-depth/src/deep.ts',
        toFilePath: 'example-typescript/packages/feature-depth/src/branch.ts',
        fromSymbolId: 'symbol:example-typescript/packages/feature-depth/src/deep.ts:function:getDepthTarget',
        toSymbolId: 'symbol:example-typescript/packages/feature-depth/src/branch.ts:function:getBranchTarget',
        specifier: './branch',
      },
    ],
  };
}

async function connectClient() {
  const server = createCodeGraphyMcpServer();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return client;
}

describe('mcp/pathResolution', () => {
  let homePath: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    homePath = createTempCodeGraphyHome();
    process.env.CODEGRAPHY_HOME = homePath;
  });

  afterEach(() => {
    process.env.CODEGRAPHY_HOME = originalHome;
    fs.rmSync(homePath, { recursive: true, force: true });
  });

  it('resolves unique file basenames when explaining relationships', async () => {
    const repo = createTempRepo(createNestedDepthSnapshot());
    const client = await connectClient();

    await client.callTool({
      name: 'codegraphy_select_repo',
      arguments: { repo: repo.workspaceRoot },
    });

    const result = await client.callTool({
      name: 'codegraphy_explain_relationship',
      arguments: { from: 'deep.ts', to: 'branch.ts' },
    });

    expect(result.structuredContent).toMatchObject({
      summary: {
        from: 'example-typescript/packages/feature-depth/src/deep.ts',
        to: 'example-typescript/packages/feature-depth/src/branch.ts',
        direct: true,
        relationCount: 2,
      },
    });
    expect((result.structuredContent as { summary: { kinds: string[] } }).summary.kinds).toEqual(
      expect.arrayContaining(['import', 'call']),
    );
  });

  it('resolves unique file basenames when summarizing files', async () => {
    const repo = createTempRepo(createNestedDepthSnapshot());
    const client = await connectClient();

    await client.callTool({
      name: 'codegraphy_select_repo',
      arguments: { repo: repo.workspaceRoot },
    });

    const result = await client.callTool({
      name: 'codegraphy_file_summary',
      arguments: { filePath: 'branch.ts' },
    });

    expect(result.structuredContent).toMatchObject({
      summary: {
        filePath: 'example-typescript/packages/feature-depth/src/branch.ts',
        declaredSymbolCount: 1,
      },
      symbols: [
        expect.objectContaining({
          id: 'symbol:example-typescript/packages/feature-depth/src/branch.ts:function:getBranchTarget',
        }),
      ],
    });
  });

  it('reports candidates instead of guessing when file basenames are ambiguous', async () => {
    const repo = createTempRepo({
      files: [],
      symbols: [
        {
          id: 'symbol:packages/app/src/config.ts:loadConfig',
          name: 'loadConfig',
          kind: 'function',
          filePath: 'packages/app/src/config.ts',
        },
        {
          id: 'symbol:packages/server/src/config.ts:loadConfig',
          name: 'loadConfig',
          kind: 'function',
          filePath: 'packages/server/src/config.ts',
        },
      ],
      relations: [],
    });
    const client = await connectClient();

    await client.callTool({
      name: 'codegraphy_select_repo',
      arguments: { repo: repo.workspaceRoot },
    });

    const result = await client.callTool({
      name: 'codegraphy_file_summary',
      arguments: { filePath: 'config.ts' },
    });

    expect(result.structuredContent).toMatchObject({
      summary: {
        status: 'ambiguous-file-path',
        input: 'config.ts',
        candidateCount: 2,
        candidates: [
          'packages/app/src/config.ts',
          'packages/server/src/config.ts',
        ],
      },
    });
  });
});
