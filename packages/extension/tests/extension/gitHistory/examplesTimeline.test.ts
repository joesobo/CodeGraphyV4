import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGDScriptPlugin } from '../../../../plugin-godot/src/plugin';
import { GitHistoryAnalyzer } from '../../../src/extension/gitHistory/analyzer';
import { getMaterialThemeDefaultGroups } from '../../../src/extension/graphView/groups/defaults/materialTheme/view';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';
import type { IGraphData } from '../../../src/shared/graph/contracts';

const examplesRoot = path.resolve(__dirname, '../../../../../examples');
const tempStorageRoots: string[] = [];

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

function createContext(storageRoot: string) {
  const stateStore = new Map<string, unknown>();

  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    storageUri: vscode.Uri.file(storageRoot),
    workspaceState: {
      get: vi.fn(<T>(key: string): T | undefined => stateStore.get(key) as T | undefined),
      update: vi.fn((key: string, value: unknown) => {
        if (value === undefined) {
          stateStore.delete(key);
        } else {
          stateStore.set(key, value);
        }

        return Promise.resolve();
      }),
    },
  };
}

async function createStorageRoot(): Promise<string> {
  const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-timeline-examples-'));
  tempStorageRoots.push(storageRoot);
  return storageRoot;
}

function getNodeIds(graph: IGraphData): string[] {
  return graph.nodes.map((node) => node.id).sort((left, right) => left.localeCompare(right));
}

function getEdgeIds(graph: IGraphData): string[] {
  return graph.edges.map((edge) => edge.id).sort((left, right) => left.localeCompare(right));
}

function graphChanged(previousGraph: IGraphData, nextGraph: IGraphData): boolean {
  return JSON.stringify({
    nodes: getNodeIds(previousGraph),
    edges: getEdgeIds(previousGraph),
  }) !== JSON.stringify({
    nodes: getNodeIds(nextGraph),
    edges: getEdgeIds(nextGraph),
  });
}

function getSampleCommitIndexes(count: number): number[] {
  return [...new Set([
    0,
    Math.floor((count - 1) / 2),
    count - 1,
  ])];
}

afterAll(async () => {
  await Promise.all(
    tempStorageRoots.splice(0).map((storageRoot) =>
      fs.rm(storageRoot, { recursive: true, force: true }),
    ),
  );
});

describe('GitHistoryAnalyzer examples timeline', { timeout: 120000 }, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(examplesRoot), name: 'examples', index: 0 },
    ];
  });

  it('replays examples history with changing nodes and edges and matches direct full analysis for sampled commits', async () => {
    const storageRoot = await createStorageRoot();
    const context = createContext(storageRoot);
    const pipeline = new WorkspacePipeline(context as unknown as vscode.ExtensionContext);

    await pipeline.initialize();
    pipeline.registry.register(createGDScriptPlugin());

    const analyzer = new GitHistoryAnalyzer(
      context as unknown as vscode.ExtensionContext,
      pipeline.registry,
      examplesRoot,
    );

    const commits = await analyzer.indexHistory(vi.fn(), new AbortController().signal, 100);
    const graphs = await Promise.all(
      commits.map(async (commit) => analyzer.getGraphDataForCommit(commit.sha)),
    );
    const nodeCounts = graphs.map((graph) => graph.nodes.length);
    const edgeCounts = graphs.map((graph) => graph.edges.length);
    const hasGraphEdges = graphs.some((graph) => graph.edges.length > 0);
    const hasGraphChanges = graphs.some((graph, index) => index > 0 && graphChanged(graphs[index - 1], graph));
    const hasNodeCountChanges = graphs.some(
      (graph, index) => index > 0 && graph.nodes.length !== graphs[index - 1].nodes.length,
    );
    const hasEdgeCountChanges = graphs.some(
      (graph, index) => index > 0 && graph.edges.length !== graphs[index - 1].edges.length,
    );

    expect(commits.length).toBeGreaterThan(1);
    if (!hasGraphEdges) {
      throw new Error(`Expected examples timeline to produce edges, got edge counts ${JSON.stringify(edgeCounts)}`);
    }
    if (!hasGraphChanges) {
      throw new Error(`Expected examples timeline graph to change, got node counts ${JSON.stringify(nodeCounts)} and edge counts ${JSON.stringify(edgeCounts)}`);
    }
    if (!hasNodeCountChanges) {
      throw new Error(`Expected examples timeline node counts to change, got ${JSON.stringify(nodeCounts)}`);
    }
    if (!hasEdgeCountChanges) {
      throw new Error(`Expected examples timeline edge counts to change, got ${JSON.stringify(edgeCounts)}`);
    }

    const initialMaterialGroups = getMaterialThemeDefaultGroups(
      graphs[0],
      vscode.Uri.file(path.resolve(examplesRoot, '..')),
    );

    expect(initialMaterialGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'default:fileExtension:html',
        pattern: '*.html',
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
      expect.objectContaining({
        id: 'default:fileExtension:tsx',
        pattern: '*.tsx',
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
    ]));

    const directFullAnalyzer = analyzer as unknown as {
      _analyzeFullCommit(sha: string, signal: AbortSignal): Promise<IGraphData>;
    };

    for (const index of getSampleCommitIndexes(commits.length)) {
      const commit = commits[index];
      const replayedGraph = graphs[index];
      const directGraph = await directFullAnalyzer._analyzeFullCommit(
        commit.sha,
        new AbortController().signal,
      );

      expect(getNodeIds(replayedGraph)).toEqual(getNodeIds(directGraph));
      expect(getEdgeIds(replayedGraph)).toEqual(getEdgeIds(directGraph));
    }
  });
});
