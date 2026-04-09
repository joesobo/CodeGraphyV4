import { describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '../../../../src/core/discovery/contracts';
import type {
  IConnection,
  IFileAnalysisResult,
} from '../../../../src/core/plugins/types/contracts';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../../../src/extension/config/defaults';
import { formatWorkspacePipelineLimitReachedMessage } from '../../../../src/extension/pipeline/discovery';
import type { IGraphData } from '../../../../src/shared/graph/types';
import { analyzeWorkspaceWithAnalyzer } from '../../../../src/extension/pipeline/analysis/analyze';

function createSource() {
  const emit = vi.fn();
  return {
    _analyzeFiles: vi.fn<
      (files: IDiscoveredFile[], workspaceRoot: string) => Promise<{
        fileAnalysis: Map<string, IFileAnalysisResult>;
        fileConnections: Map<string, IConnection[]>;
      }>
    >(async () => ({
      fileAnalysis: new Map(),
      fileConnections: new Map(),
    })),
    _buildGraphDataFromAnalysis: vi.fn<() => IGraphData>(() => ({
      nodes: [{ id: 'src/index.ts', label: 'index.ts', color: '#93C5FD' }],
      edges: [{ id: 'src/index.ts->src/utils.ts#import', from: 'src/index.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
    } satisfies IGraphData)),
    _buildGraphData: vi.fn<() => IGraphData>(() => ({
      nodes: [{ id: 'src/index.ts', label: 'index.ts', color: '#93C5FD' }],
      edges: [{ id: 'src/index.ts->src/utils.ts#import', from: 'src/index.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
    } satisfies IGraphData)),
    _eventBus: { emit },
    _lastDiscoveredFiles: [] as IDiscoveredFile[],
    _lastFileAnalysis: new Map(),
    _lastFileConnections: new Map<string, IConnection[]>(),
    _lastWorkspaceRoot: '',
    _preAnalyzePlugins: vi.fn(async () => undefined),
    getPluginFilterPatterns: vi.fn(() => ['**/*.generated.ts']),
  };
}

function createDependencies() {
  return {
    discover: vi.fn(async () => ({
      durationMs: 3,
      files: [] as IDiscoveredFile[],
      limitReached: false,
      totalFound: 0,
    })),
    getConfig: vi.fn(() => ({
      include: ['**/*'],
      maxFiles: 25,
      respectGitignore: true,
      showOrphans: true,
    })),
    getWorkspaceRoot: vi.fn<() => string | undefined>(() => '/workspace'),
    logInfo: vi.fn(),
    saveCache: vi.fn(),
    showWarningMessage: vi.fn(),
  };
}

describe('pipeline/analysis/analyze', () => {
  it('returns an empty graph when no workspace root is available', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    dependencies.getWorkspaceRoot.mockReturnValue(undefined);

    await expect(
      analyzeWorkspaceWithAnalyzer(source as never, dependencies as never),
    ).resolves.toEqual({ nodes: [], edges: [] });

    expect(dependencies.logInfo).toHaveBeenCalledWith('[CodeGraphy] No workspace folder open');
    expect(dependencies.discover).not.toHaveBeenCalled();
    expect(source._preAnalyzePlugins).not.toHaveBeenCalled();
    expect(source._analyzeFiles).not.toHaveBeenCalled();
    expect(dependencies.saveCache).not.toHaveBeenCalled();
  });

  it('uses only default and plugin filters when user filters are omitted', async () => {
    const source = createSource();
    const dependencies = createDependencies();

    await analyzeWorkspaceWithAnalyzer(source as never, dependencies as never);

    expect(dependencies.discover).toHaveBeenCalledWith({
      rootPath: '/workspace',
      maxFiles: 25,
      include: ['**/*'],
      exclude: [...DEFAULT_EXCLUDE_PATTERNS, '**/*.generated.ts'],
      respectGitignore: true,
      signal: undefined,
    });
  });

  it('discovers, analyzes, caches, and emits lifecycle events', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const files = [
      { absolutePath: '/workspace/src/index.ts', relativePath: 'src/index.ts' },
    ] as IDiscoveredFile[];
    const fileAnalysis = new Map<string, IFileAnalysisResult>([
      ['src/index.ts', { filePath: '/workspace/src/index.ts', relations: [] }],
    ]);
    const fileConnections = new Map<string, IConnection[]>([['src/index.ts', []]]);
    const graphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'index.ts', color: '#93C5FD' }],
      edges: [{ id: 'src/index.ts->src/utils.ts#import', from: 'src/index.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
    };

    dependencies.discover.mockResolvedValue({
      durationMs: 4,
      files,
      limitReached: false,
      totalFound: 1,
    });
    source._analyzeFiles.mockResolvedValue({
      fileAnalysis,
      fileConnections,
    });
    source._buildGraphDataFromAnalysis.mockReturnValue(graphData);

    await expect(
      analyzeWorkspaceWithAnalyzer(
        source as never,
        dependencies as never,
        ['**/*.user.ts'],
        new Set<string>(['plugin.python']),
      ),
    ).resolves.toEqual(graphData);

    expect(dependencies.discover).toHaveBeenCalledOnce();
    expect(source._preAnalyzePlugins).toHaveBeenCalledWith(files, '/workspace', undefined);
    expect(source._analyzeFiles).toHaveBeenCalledWith(
      files,
      '/workspace',
      expect.any(Function),
      undefined,
    );
    expect(source._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      fileAnalysis,
      '/workspace',
      true,
      new Set<string>(['plugin.python']),
    );
    expect(source._lastDiscoveredFiles).toEqual(files);
    expect(source._lastFileAnalysis).toBe(fileAnalysis);
    expect(source._lastFileConnections).toBe(fileConnections);
    expect(source._lastWorkspaceRoot).toBe('/workspace');
    expect(dependencies.saveCache).toHaveBeenCalledOnce();
    expect(dependencies.logInfo).toHaveBeenCalledWith('[CodeGraphy] Discovered 1 files in 4ms');
    expect(dependencies.logInfo).toHaveBeenCalledWith('[CodeGraphy] Graph built: 1 nodes, 1 edges');
    expect(source._eventBus.emit).toHaveBeenNthCalledWith(1, 'analysis:started', {
      fileCount: 1,
    });
    expect(source._eventBus.emit).toHaveBeenNthCalledWith(2, 'analysis:completed', {
      graph: {
        nodes: [{ id: 'src/index.ts' }],
        edges: [{ id: 'src/index.ts->src/utils.ts#import' }],
      },
      duration: 0,
    });
  });

  it('shows the discovery warning when the file limit is reached', async () => {
    const source = createSource();
    const dependencies = createDependencies();

    dependencies.discover.mockResolvedValue({
      durationMs: 5,
      files: [] as IDiscoveredFile[],
      limitReached: true,
      totalFound: 27,
    });

    await analyzeWorkspaceWithAnalyzer(source as never, dependencies as never);

    expect(dependencies.showWarningMessage).toHaveBeenCalledWith(
      formatWorkspacePipelineLimitReachedMessage(27, 25),
    );
  });
});
