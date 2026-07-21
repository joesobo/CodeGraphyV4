import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeUnitySerializedFile } from '../../../../plugin-unity/src/analysis';
import {
  buildCompleteWorkspaceGraphData,
  readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
  type IWorkspaceAnalysisCache,
} from '@codegraphy-dev/core';
import {
  copyExampleWorkspace,
  createWorkspaceTempRoot,
  readExampleWorkspaceFiles,
} from '../../acceptance/graphView/workspace';

const tempRoots = new Set<string>();

afterEach(async () => {
  await Promise.all([...tempRoots].map(root => fs.rm(root, { recursive: true, force: true })));
  tempRoots.clear();
});

describe('Unity Graph Cache round trip', { timeout: 30_000 }, () => {
  it('persists each complete graph node under its canonical key once', async () => {
    const tempRoot = createWorkspaceTempRoot();
    tempRoots.add(tempRoot);
    const workspaceRoot = copyExampleWorkspace(tempRoot, 'example-unity');
    const relativePaths = await readExampleWorkspaceFiles(workspaceRoot);
    const fileAnalysis = new Map<string, IFileAnalysisResult>();
    const cache: IWorkspaceAnalysisCache = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    };

    for (const relativePath of relativePaths) {
      const absolutePath = path.join(workspaceRoot, relativePath);
      const content = await fs.readFile(absolutePath, 'utf8');
      const analysis = analyzeUnitySerializedFile(absolutePath, content, { workspaceRoot });
      cache.files[relativePath] = { mtime: 1, size: content.length, analysis };
      fileAnalysis.set(absolutePath, analysis);
    }

    const graph = buildCompleteWorkspaceGraphData({
      cacheFiles: cache.files,
      disabledPlugins: new Set(),
      fileAnalysis,
      getPluginForFile: () => undefined,
      showOrphans: true,
      workspaceRoot,
    });
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, graph);
    const persistedGraph = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph;
    const expectedKeys = [...new Set(graph.nodes.map(node => node.id))].sort();
    const persistedKeys = persistedGraph.nodes.map(node => node.id).sort();

    expect(relativePaths).toHaveLength(36);
    expect(graph.nodes).toHaveLength(135);
    expect(persistedKeys).toHaveLength(135);
    expect(persistedKeys).toEqual(expectedKeys);
  });
});
