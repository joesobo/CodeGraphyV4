import { rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCodeGraphyWorkspaceCacheUpdater,
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

function canonicalGraph(workspaceRoot: string) {
  const graph = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph;
  return {
    nodes: [...graph.nodes].sort((left, right) => left.id.localeCompare(right.id)),
    edges: [...graph.edges].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

async function compareLiveUpdateWithFreshIndex(
  workspaceRoot: string,
  change: () => Promise<readonly string[]>,
): Promise<{ freshGraph: ReturnType<typeof canonicalGraph>; liveGraph: ReturnType<typeof canonicalGraph> }> {
  let markUpdated!: () => void;
  const updated = new Promise<void>((resolve) => {
    markUpdated = resolve;
  });
  const updater = createCodeGraphyWorkspaceCacheUpdater({
    workspaceRoot,
    plugins: [textPlugin()],
    includeCorePlugins: false,
    onEvent(event) {
      if (event.type === 'updated') markUpdated();
    },
  });
  await updater.start();
  vi.useFakeTimers();
  updater.notify(await change());
  await vi.advanceTimersByTimeAsync(500);
  await updated;
  await updater.dispose();
  const liveGraph = canonicalGraph(workspaceRoot);

  const freshEngine = createCodeGraphyWorkspaceEngine({
    workspaceRoot,
    plugins: [textPlugin()],
    includeCorePlugins: false,
  });
  await freshEngine.index();
  freshEngine.dispose();

  return { freshGraph: canonicalGraph(workspaceRoot), liveGraph };
}

describe('live-update equivalence with fresh Indexing', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('matches a fresh index after discovering a newly created target', async () => {
    const workspaceRoot = await createWorkspace();

    const graphs = await compareLiveUpdateWithFreshIndex(workspaceRoot, async () => {
      const sourcePath = join(workspaceRoot, 'source.txt');
      const targetPath = join(workspaceRoot, 'created.txt');
      await writeFile(targetPath, 'created\n', 'utf-8');
      await writeFile(sourcePath, 'created.txt\n', 'utf-8');
      return [sourcePath, targetPath];
    });

    expect(graphs.liveGraph).toEqual(graphs.freshGraph);
  });

  it('matches a fresh index after deleting a referenced file', async () => {
    const workspaceRoot = await createWorkspace();

    const graphs = await compareLiveUpdateWithFreshIndex(workspaceRoot, async () => {
      const targetPath = join(workspaceRoot, 'target.txt');
      await rm(targetPath);
      return [targetPath];
    });

    expect(graphs.liveGraph).toEqual(graphs.freshGraph);
  });

  it('matches a fresh index after a referenced file is renamed', async () => {
    const workspaceRoot = await createWorkspace();

    const graphs = await compareLiveUpdateWithFreshIndex(workspaceRoot, async () => {
      const sourcePath = join(workspaceRoot, 'source.txt');
      const oldPath = join(workspaceRoot, 'target.txt');
      const newPath = join(workspaceRoot, 'renamed.txt');
      await rename(oldPath, newPath);
      await writeFile(sourcePath, 'renamed.txt\n', 'utf-8');
      return [oldPath, newPath, sourcePath];
    });

    expect(graphs.liveGraph).toEqual(graphs.freshGraph);
  });
});
