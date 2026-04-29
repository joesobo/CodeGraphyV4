import * as fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadQueryContext } from '../../src/query/load';
import { readViewGraph } from '../../src/viewGraph/read';
import { createTempCodeGraphyHome, createTempRepo, writeRepoSettings } from '../support/database';

describe('viewGraph/read', () => {
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

  it('projects folder and package nodes from saved CodeGraphy view settings', () => {
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

    const context = loadQueryContext(repo.workspaceRoot);
    const result = readViewGraph(context);

    expect(result.summary).toMatchObject({
      includeFolders: true,
      includePackages: true,
      showOrphans: false,
      nodeTypeCounts: {
        file: expect.any(Number),
        folder: expect.any(Number),
        package: expect.any(Number),
      },
      edgeKindCounts: {
        import: 1,
        'codegraphy:nests': expect.any(Number),
      },
    });
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'packages',
      'packages/feature-depth',
      'pkg:workspace:packages/feature-depth',
    ]));
  });

  it('applies depth mode around the focused file or symbol from the saved settings', () => {
    const repo = createTempRepo({
      symbols: [
        {
          id: 'symbol:src/a.ts:exportAsJson',
          name: 'exportAsJson',
          kind: 'function',
          filePath: 'src/a.ts',
        },
        {
          id: 'symbol:src/b.ts:useExport',
          name: 'useExport',
          kind: 'function',
          filePath: 'src/b.ts',
        },
        {
          id: 'symbol:src/c.ts:runner',
          name: 'runner',
          kind: 'function',
          filePath: 'src/c.ts',
        },
      ],
      relations: [
        {
          kind: 'import',
          sourceId: 'ts:import',
          fromFilePath: 'src/b.ts',
          toFilePath: 'src/a.ts',
          fromSymbolId: 'symbol:src/b.ts:useExport',
          toSymbolId: 'symbol:src/a.ts:exportAsJson',
        },
        {
          kind: 'call',
          sourceId: 'ts:call',
          fromFilePath: 'src/c.ts',
          toFilePath: 'src/b.ts',
          fromSymbolId: 'symbol:src/c.ts:runner',
          toSymbolId: 'symbol:src/b.ts:useExport',
        },
      ],
    });
    writeRepoSettings(repo, {
      depthMode: true,
      depthLimit: 1,
      showOrphans: false,
    });

    const context = loadQueryContext(repo.workspaceRoot);
    const result = readViewGraph(context, {
      focus: 'symbol:src/c.ts:runner',
    });

    expect(result.summary).toMatchObject({
      depthMode: true,
      depthLimit: 1,
      focus: 'symbol:src/c.ts:runner',
    });
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'src/c.ts',
      'src/b.ts',
    ]));
    expect(result.nodes.map((node) => node.id)).not.toContain('src/a.ts');
  });
});
