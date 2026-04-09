import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IDiscoveredFile } from '../../../../src/core/discovery/contracts';
import type { IConnection } from '../../../../src/core/plugins/types/contracts';
import * as analyzeModule from '../../../../src/extension/pipeline/analysis/analyze';
import * as databaseCacheModule from '../../../../src/extension/pipeline/database/cache';
import { runWorkspacePipelineAnalysis } from '../../../../src/extension/pipeline/analysis/run';

describe('pipeline/analysis/run', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates analysis through the shared runner with workspace defaults', async () => {
    const analyzeWorkspaceWithAnalyzerSpy = vi
      .spyOn(analyzeModule, 'analyzeWorkspaceWithAnalyzer')
      .mockResolvedValue({ nodes: [], edges: [] });
    const showWarningMessageSpy = vi.fn();
    const saveWorkspaceAnalysisDatabaseCacheSpy = vi
      .spyOn(databaseCacheModule, 'saveWorkspaceAnalysisDatabaseCache')
      .mockImplementation(() => undefined);
    (vscode.window as Record<string, unknown>).showWarningMessage = showWarningMessageSpy;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const source = {
      _analyzeFiles: vi.fn<
        (files: IDiscoveredFile[], workspaceRoot: string) => Promise<Map<string, IConnection[]>>
      >(async () => new Map()),
      _buildGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
      _lastDiscoveredFiles: [] as IDiscoveredFile[],
      _lastFileConnections: new Map<string, IConnection[]>(),
      _lastWorkspaceRoot: '',
      _preAnalyzePlugins: vi.fn(async () => undefined),
      getPluginFilterPatterns: vi.fn(() => []),
    };
    const cache = { files: {}, version: '1' };
    const config = {
      getAll: vi.fn(() => ({
        include: ['**/*'],
        maxFiles: 25,
        respectGitignore: true,
        showOrphans: true,
      })),
    };
    const discovery = {
      discover: vi.fn(async () => ({
        durationMs: 1,
        files: [] as IDiscoveredFile[],
        limitReached: false,
        totalFound: 0,
      })),
    };
    await expect(
      runWorkspacePipelineAnalysis(
        source as never,
        cache as never,
        config as never,
        discovery as never,
        () => '/workspace',
        ['**/*.generated.ts'],
        new Set(['plugin.python']),
      ),
    ).resolves.toEqual({ nodes: [], edges: [] });

    const dependencies = analyzeWorkspaceWithAnalyzerSpy.mock.calls[0][1];
    expect(analyzeWorkspaceWithAnalyzerSpy.mock.calls[0][0]).toBe(source);
    expect(analyzeWorkspaceWithAnalyzerSpy.mock.calls[0][2]).toEqual(['**/*.generated.ts']);
    expect(analyzeWorkspaceWithAnalyzerSpy.mock.calls[0][3]).toEqual(
      new Set(['plugin.python']),
    );
    expect(dependencies.getConfig()).toEqual(config.getAll());
    expect(dependencies.getWorkspaceRoot()).toBe('/workspace');
    await dependencies.discover({
      rootPath: '/workspace',
      include: ['**/*'],
      exclude: [],
      maxFiles: 25,
      respectGitignore: true,
    });
    expect(discovery.discover).toHaveBeenCalledOnce();
    dependencies.logInfo('hello');
    expect(logSpy).toHaveBeenCalledWith('hello');
    dependencies.showWarningMessage('warning');
    expect(showWarningMessageSpy).toHaveBeenCalledWith('warning');
    dependencies.saveCache();
    expect(saveWorkspaceAnalysisDatabaseCacheSpy).toHaveBeenCalledWith('/workspace', cache);
  });

  it('passes empty user filters and disabled sets when they are omitted', async () => {
    const analyzeWorkspaceWithAnalyzerSpy = vi
      .spyOn(analyzeModule, 'analyzeWorkspaceWithAnalyzer')
      .mockResolvedValue({ nodes: [], edges: [] });

    await runWorkspacePipelineAnalysis(
      {
        _analyzeFiles: vi.fn(async () => new Map()),
        _buildGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
        _lastDiscoveredFiles: [],
        _lastFileConnections: new Map(),
        _lastWorkspaceRoot: '',
        _preAnalyzePlugins: vi.fn(async () => undefined),
        getPluginFilterPatterns: vi.fn(() => []),
      } as never,
      { files: {}, version: '1' } as never,
      {
        getAll: vi.fn(() => ({
          include: ['**/*'],
          maxFiles: 25,
          respectGitignore: true,
          showOrphans: true,
        })),
      } as never,
      {
        discover: vi.fn(async () => ({
          durationMs: 1,
          files: [],
          limitReached: false,
          totalFound: 0,
        })),
      } as never,
      () => '/workspace',
    );

    expect(analyzeWorkspaceWithAnalyzerSpy.mock.calls[0][2]).toEqual([]);
    expect(analyzeWorkspaceWithAnalyzerSpy.mock.calls[0][3]).toEqual(new Set());
  });
});
