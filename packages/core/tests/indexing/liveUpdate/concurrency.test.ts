import { writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createCodeGraphyWorkspaceEngine,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '../../../src';
import { createTextPlugin, createWorkspace } from '../workspaceFixture';

function textPlugin() {
  return createTextPlugin({
    onPreAnalyze: vi.fn(),
    onPostAnalyze: vi.fn(),
    onWorkspaceReady: vi.fn(),
    analyzeFile: vi.fn(),
  });
}

function edgeIdentities(workspaceRoot: string): string[] {
  return readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph.edges
    .map(edge => edge.id)
    .sort();
}

describe('concurrent workspace cache updaters', () => {
  it('does not let an older full reconciliation overwrite a newer committed Relationship', async () => {
    const workspaceRoot = await createWorkspace();
    const sourcePath = join(workspaceRoot, 'source.txt');
    await writeFile(join(workspaceRoot, 'next.txt'), 'next\n', 'utf-8');
    await writeFile(join(workspaceRoot, 'overflow.txt'), 'overflow\n', 'utf-8');
    let pauseAnalysis = false;
    let markOlderAnalysisStarted!: () => void;
    let finishOlderAnalysis!: () => void;
    const olderAnalysisStarted = new Promise<void>((resolve) => {
      markOlderAnalysisStarted = resolve;
    });
    const olderAnalysisGate = new Promise<void>((resolve) => {
      finishOlderAnalysis = resolve;
    });
    const basePlugin = textPlugin();
    const olderEngine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      maxFiles: 3,
      plugins: [{
        ...basePlugin,
        async analyzeFile(filePath, content, rootPath, context) {
          if (pauseAnalysis && basename(filePath) === 'source.txt') {
            pauseAnalysis = false;
            markOlderAnalysisStarted();
            await olderAnalysisGate;
          }
          return basePlugin.analyzeFile!(filePath, content, rootPath, context);
        },
      }],
      includeCorePlugins: false,
    });
    const newerEngine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      maxFiles: 3,
      plugins: [textPlugin()],
      includeCorePlugins: false,
    });
    await olderEngine.index();
    await newerEngine.index();

    pauseAnalysis = true;
    await writeFile(sourcePath, 'target.txt\n', 'utf-8');
    const olderUpdate = olderEngine.applyChangedFiles([sourcePath]);
    await olderAnalysisStarted;
    await writeFile(sourcePath, 'next.txt\n', 'utf-8');
    await newerEngine.applyChangedFiles([sourcePath]);
    finishOlderAnalysis();
    await olderUpdate;
    olderEngine.dispose();
    newerEngine.dispose();
    const concurrentEdges = edgeIdentities(workspaceRoot);

    const freshEngine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      maxFiles: 3,
      plugins: [textPlugin()],
      includeCorePlugins: false,
    });
    await freshEngine.index();
    freshEngine.dispose();

    expect(concurrentEdges).toContain('source.txt->next.txt#import');
    expect(concurrentEdges).toEqual(edgeIdentities(workspaceRoot));
  });

  it('does not let an older incremental analysis overwrite a newer committed Relationship', async () => {
    const workspaceRoot = await createWorkspace();
    const sourcePath = join(workspaceRoot, 'source.txt');
    await writeFile(join(workspaceRoot, 'next.txt'), 'next\n', 'utf-8');
    let pauseAnalysis = false;
    let markOlderAnalysisStarted!: () => void;
    let finishOlderAnalysis!: () => void;
    const olderAnalysisStarted = new Promise<void>((resolve) => {
      markOlderAnalysisStarted = resolve;
    });
    const olderAnalysisGate = new Promise<void>((resolve) => {
      finishOlderAnalysis = resolve;
    });
    const basePlugin = textPlugin();
    const olderEngine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [{
        ...basePlugin,
        async analyzeFile(filePath, content, rootPath, context) {
          if (pauseAnalysis && basename(filePath) === 'source.txt') {
            markOlderAnalysisStarted();
            await olderAnalysisGate;
          }
          return basePlugin.analyzeFile!(filePath, content, rootPath, context);
        },
      }],
      includeCorePlugins: false,
    });
    const newerEngine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [textPlugin()],
      includeCorePlugins: false,
    });
    await olderEngine.index();
    await newerEngine.index();

    pauseAnalysis = true;
    await writeFile(sourcePath, 'target.txt\n', 'utf-8');
    const olderUpdate = olderEngine.applyChangedFiles([sourcePath]);
    await olderAnalysisStarted;
    await writeFile(sourcePath, 'next.txt\n', 'utf-8');
    await newerEngine.applyChangedFiles([sourcePath]);
    finishOlderAnalysis();
    await olderUpdate;
    olderEngine.dispose();
    newerEngine.dispose();
    const concurrentEdges = edgeIdentities(workspaceRoot);

    const freshEngine = createCodeGraphyWorkspaceEngine({
      workspaceRoot,
      plugins: [textPlugin()],
      includeCorePlugins: false,
    });
    await freshEngine.index();
    freshEngine.dispose();

    expect(concurrentEdges).toEqual(edgeIdentities(workspaceRoot));
  });
});
