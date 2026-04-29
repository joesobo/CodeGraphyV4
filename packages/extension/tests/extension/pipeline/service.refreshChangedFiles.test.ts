import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => [{ uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 }],
  configurable: true,
});

(vscode.window as Record<string, unknown>).showWarningMessage = vi.fn();

function createContext() {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

describe('WorkspacePipeline refreshChangedFiles', () => {
  it('re-analyzes only the changed file and plugin-requested dependents', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const analyzerPrivate = analyzer as unknown as {
      _config: {
        getAll: () => {
          include: string[];
          maxFiles: number;
          respectGitignore: boolean;
          showOrphans: boolean;
          pluginOrder: string[];
        };
      };
      _discovery: {
        discover: ReturnType<typeof vi.fn>;
      };
      _registry: {
        notifyFilesChanged: ReturnType<typeof vi.fn>;
        setPluginOrder: ReturnType<typeof vi.fn>;
      };
      _analyzeFiles: ReturnType<typeof vi.fn>;
      _buildGraphDataFromAnalysis: ReturnType<typeof vi.fn>;
      _readAnalysisFiles?: ReturnType<typeof vi.fn>;
      _persistIndexMetadata?: ReturnType<typeof vi.fn>;
      _lastFileAnalysis: Map<string, IFileAnalysisResult>;
      _lastFileConnections: Map<string, unknown[]>;
      _lastDiscoveredFiles: Array<{ absolutePath: string; relativePath: string }>;
      _lastWorkspaceRoot: string;
    };

    vi.spyOn(analyzer, 'analyze').mockResolvedValue({ nodes: [], edges: [] });
    vi.spyOn(analyzer, 'getPluginFilterPatterns').mockReturnValue([]);
    vi.spyOn(analyzerPrivate._config, 'getAll').mockReturnValue({
      include: ['**/*'],
      maxFiles: 25,
      respectGitignore: true,
      showOrphans: true,
      pluginOrder: [],
    });
    analyzerPrivate._discovery.discover = vi.fn(async () => ({
      durationMs: 1,
      files: [
        { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
        { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
        { absolutePath: '/workspace/src/c.ts', relativePath: 'src/c.ts' },
      ],
      limitReached: false,
      totalFound: 3,
    }));
    analyzerPrivate._registry.notifyFilesChanged = vi.fn(async () => ({
      additionalFilePaths: ['src/b.ts'],
      requiresFullRefresh: false,
    }));
    analyzerPrivate._readAnalysisFiles = vi.fn(async (files: Array<{ relativePath: string }>) =>
      files.map((file) => ({
        absolutePath: `/workspace/${file.relativePath}`,
        relativePath: file.relativePath,
        content: `content:${file.relativePath}`,
      })),
    );
    analyzerPrivate._analyzeFiles = vi.fn(async (files: Array<{ relativePath: string }>) => ({
      cacheHits: 0,
      cacheMisses: files.length,
      fileAnalysis: new Map(files.map((file) => [file.relativePath, {
        filePath: `/workspace/${file.relativePath}`,
        relations: [],
      }])),
      fileConnections: new Map(files.map((file) => [file.relativePath, []])),
    }));
    analyzerPrivate._buildGraphDataFromAnalysis = vi.fn(() => ({ nodes: [], edges: [] }));
    analyzerPrivate._persistIndexMetadata = vi.fn(async () => undefined);

    await analyzer.refreshChangedFiles(['/workspace/src/a.ts']);

    expect(analyzer.analyze).not.toHaveBeenCalled();
    expect(analyzerPrivate._registry.notifyFilesChanged).toHaveBeenCalledWith([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'content:src/a.ts',
      },
    ], '/workspace');
    expect(analyzerPrivate._analyzeFiles).toHaveBeenCalledWith(
      [
        { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
        { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
      ],
      '/workspace',
      expect.any(Function),
      undefined,
    );
  });

  it('re-analyzes files discovered below a changed directory path', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const analyzerPrivate = analyzer as unknown as {
      _config: {
        getAll: () => {
          include: string[];
          maxFiles: number;
          respectGitignore: boolean;
          showOrphans: boolean;
          pluginOrder: string[];
        };
      };
      _discovery: {
        discover: ReturnType<typeof vi.fn>;
      };
      _registry: {
        notifyFilesChanged: ReturnType<typeof vi.fn>;
        setPluginOrder: ReturnType<typeof vi.fn>;
      };
      _analyzeFiles: ReturnType<typeof vi.fn>;
      _buildGraphDataFromAnalysis: ReturnType<typeof vi.fn>;
      _readAnalysisFiles?: ReturnType<typeof vi.fn>;
      _persistIndexMetadata?: ReturnType<typeof vi.fn>;
    };

    vi.spyOn(analyzer, 'analyze').mockResolvedValue({ nodes: [], edges: [] });
    vi.spyOn(analyzer, 'getPluginFilterPatterns').mockReturnValue([]);
    vi.spyOn(analyzerPrivate._config, 'getAll').mockReturnValue({
      include: ['**/*'],
      maxFiles: 25,
      respectGitignore: true,
      showOrphans: true,
      pluginOrder: [],
    });
    analyzerPrivate._discovery.discover = vi.fn(async () => ({
      durationMs: 1,
      files: [
        { absolutePath: '/workspace/src/new/index.ts', relativePath: 'src/new/index.ts' },
      ],
      limitReached: false,
      totalFound: 1,
    }));
    analyzerPrivate._registry.notifyFilesChanged = vi.fn(async () => ({
      additionalFilePaths: [],
      requiresFullRefresh: false,
    }));
    analyzerPrivate._readAnalysisFiles = vi.fn(async (files: Array<{ relativePath: string }>) =>
      files.map((file) => ({
        absolutePath: `/workspace/${file.relativePath}`,
        relativePath: file.relativePath,
        content: `content:${file.relativePath}`,
      })),
    );
    analyzerPrivate._analyzeFiles = vi.fn(async (files: Array<{ relativePath: string }>) => ({
      cacheHits: 0,
      cacheMisses: files.length,
      fileAnalysis: new Map(files.map((file) => [file.relativePath, {
        filePath: `/workspace/${file.relativePath}`,
        relations: [],
      }])),
      fileConnections: new Map(files.map((file) => [file.relativePath, []])),
    }));
    analyzerPrivate._buildGraphDataFromAnalysis = vi.fn(() => ({ nodes: [], edges: [] }));
    analyzerPrivate._persistIndexMetadata = vi.fn(async () => undefined);

    await analyzer.refreshChangedFiles(['/workspace/src/new']);

    expect(analyzer.analyze).not.toHaveBeenCalled();
    expect(analyzerPrivate._readAnalysisFiles).toHaveBeenCalledWith([
      { absolutePath: '/workspace/src/new/index.ts', relativePath: 'src/new/index.ts' },
    ]);
    expect(analyzerPrivate._analyzeFiles).toHaveBeenCalledWith(
      [{ absolutePath: '/workspace/src/new/index.ts', relativePath: 'src/new/index.ts' }],
      '/workspace',
      expect.any(Function),
      undefined,
    );
  });

  it('falls back to full analysis when a changed path is no longer discovered', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const analyzerPrivate = analyzer as unknown as {
      _config: {
        getAll: () => {
          include: string[];
          maxFiles: number;
          respectGitignore: boolean;
          showOrphans: boolean;
          pluginOrder: string[];
        };
      };
      _discovery: {
        discover: ReturnType<typeof vi.fn>;
      };
      _registry: {
        notifyFilesChanged: ReturnType<typeof vi.fn>;
        setPluginOrder: ReturnType<typeof vi.fn>;
      };
      _readAnalysisFiles?: ReturnType<typeof vi.fn>;
    };
    const invalidateWorkspaceFiles = vi.spyOn(analyzer, 'invalidateWorkspaceFiles');

    vi.spyOn(analyzer, 'analyze').mockResolvedValue({
      nodes: [{ id: 'fresh', label: 'fresh.ts', color: '#ffffff' }],
      edges: [],
    });
    vi.spyOn(analyzer, 'getPluginFilterPatterns').mockReturnValue([]);
    vi.spyOn(analyzerPrivate._config, 'getAll').mockReturnValue({
      include: ['**/*'],
      maxFiles: 25,
      respectGitignore: true,
      showOrphans: true,
      pluginOrder: [],
    });
    analyzerPrivate._discovery.discover = vi.fn(async () => ({
      durationMs: 1,
      files: [{ absolutePath: '/workspace/src/keep.ts', relativePath: 'src/keep.ts' }],
      limitReached: false,
      totalFound: 1,
    }));
    analyzerPrivate._registry.notifyFilesChanged = vi.fn(async () => ({
      additionalFilePaths: [],
      requiresFullRefresh: false,
    }));
    analyzerPrivate._readAnalysisFiles = vi.fn(async () => []);

    await expect(analyzer.refreshChangedFiles(['/workspace/src/remove.ts'])).resolves.toEqual({
      nodes: [{ id: 'fresh', label: 'fresh.ts', color: '#ffffff' }],
      edges: [],
    });

    expect(invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/remove.ts']);
    expect(analyzerPrivate._registry.notifyFilesChanged).not.toHaveBeenCalled();
    expect(analyzer.analyze).toHaveBeenCalledWith(
      [],
      new Set(),
      undefined,
      expect.any(Function),
    );
  });
});
