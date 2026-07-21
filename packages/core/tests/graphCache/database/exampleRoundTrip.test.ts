import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { afterEach, describe, expect, it } from 'vitest';
import type { IWorkspaceAnalysisCache } from '../../../src/analysis/cache';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../../../src/analysis/cache';
import { buildCompleteWorkspaceGraphData } from '../../../src/graph/complete';
import {
  readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache,
} from '../../../src/graphCache/database/storage';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';
import { deriveVisibleGraph } from '../../../src/visibleGraph/derive';

const tempRoots = new Set<string>();

async function collectSourceFiles(directory: string, extensions: ReadonlySet<string>): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(absolutePath, extensions);
    return extensions.has(path.extname(entry.name)) ? [absolutePath] : [];
  }));
  return files.flat().sort();
}

async function createExampleAnalysis(
  exampleName: string,
  extensions: ReadonlySet<string>,
): Promise<{
  cache: IWorkspaceAnalysisCache;
  fileAnalysis: Map<string, IFileAnalysisResult>;
  workspaceRoot: string;
}> {
  const sourceRoot = path.resolve(__dirname, `../../../../../examples/${exampleName}`);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `codegraphy-${exampleName}-`));
  const workspaceRoot = path.join(tempRoot, exampleName);
  await fs.cp(sourceRoot, workspaceRoot, { recursive: true });
  tempRoots.add(tempRoot);

  const cache: IWorkspaceAnalysisCache = {
    version: WORKSPACE_ANALYSIS_CACHE_VERSION,
    files: {},
  };
  const fileAnalysis = new Map<string, IFileAnalysisResult>();
  for (const filePath of await collectSourceFiles(workspaceRoot, extensions)) {
    const source = await fs.readFile(filePath, 'utf8');
    const analysis = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot, {
      includeSymbols: true,
    });
    if (!analysis) continue;
    const relativePath = path.relative(workspaceRoot, filePath).split(path.sep).join('/');
    cache.files[relativePath] = { mtime: 1, size: source.length, analysis };
    fileAnalysis.set(filePath, analysis);
  }

  return { cache, fileAnalysis, workspaceRoot };
}

function visibleCallPairs(graphData: Parameters<typeof deriveVisibleGraph>[0]): string[] {
  const visible = deriveVisibleGraph(graphData, {
    scope: {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'folder', enabled: false },
        { type: 'package', enabled: false },
        { type: 'symbol', enabled: false },
        { type: 'variable', enabled: false },
      ],
      edges: [
        { type: 'call', enabled: true },
        { type: 'contains', enabled: false },
        { type: 'import', enabled: false },
        { type: 'include', enabled: false },
        { type: 'inherit', enabled: false },
        { type: 'reference', enabled: false },
      ],
    },
  }).graphData;
  return (visible?.edges ?? []).map(edge => `${edge.from}->${edge.to}`).sort();
}

afterEach(async () => {
  await Promise.all([...tempRoots].map(root => fs.rm(root, { recursive: true, force: true })));
  tempRoots.clear();
});

describe('Graph Cache example round trips', { timeout: 30_000 }, () => {
  it.each([
    ['example-c', new Set(['.c', '.h']), 4],
    ['example-dart', new Set(['.dart']), 7],
    ['example-python', new Set(['.py']), 6],
  ] as const)('preserves file-projected Calls in %s', async (exampleName, extensions, expectedCount) => {
    const { cache, fileAnalysis, workspaceRoot } = await createExampleAnalysis(exampleName, extensions);
    const graph = buildCompleteWorkspaceGraphData({
      cacheFiles: cache.files,
      disabledPlugins: new Set(),
      fileAnalysis,
      getPluginForFile: () => undefined,
      showOrphans: true,
      workspaceRoot,
    });
    const liveCalls = visibleCallPairs(graph);

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, graph);
    const persistedCalls = visibleCallPairs(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph,
    );

    expect(liveCalls).toHaveLength(expectedCount);
    expect(persistedCalls).toEqual(liveCalls);
  });
});
