import { describe, expect, it, vi } from 'vitest';

import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../../../../src/discovery/contracts';
import { refreshWorkspaceIndexPluginFiles } from '../../../../src/indexing/refresh';
import {
  createDiscoveredFile,
  createFileAnalysis,
  createSource,
} from '../fixture';

describe('indexing/refresh/modes/pluginFiles', () => {
  it('rebuilds from retained state when no requested plugins are registered', async () => {
    const persistIndexMetadata = vi.fn();
    const source = createSource();

    await refreshWorkspaceIndexPluginFiles(source, {
      disabledPlugins: new Set(),
      discoveredFiles: [createDiscoveredFile('src/app.ts')],
      onProgress: vi.fn(),
      persistCache: vi.fn(),
      persistIndexMetadata,
      pluginIds: ['codegraphy.missing'],
      pluginInfos: [createPluginInfo('codegraphy.typescript', ['.ts'])],
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._analyzeFiles).not.toHaveBeenCalled();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();
  });

  it('skips analysis and progress when registered plugins have no matching files', async () => {
    const onProgress = vi.fn();
    const persistCache = vi.fn();
    const source = createSource();

    await refreshWorkspaceIndexPluginFiles(source, {
      disabledPlugins: new Set(),
      discoveredFiles: [createDiscoveredFile('src/app.ts')],
      onProgress,
      persistCache,
      persistIndexMetadata: vi.fn(),
      pluginIds: ['codegraphy.python'],
      pluginInfos: [createPluginInfo('codegraphy.python', ['.py'])],
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._analyzeFiles).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
    expect(persistCache).not.toHaveBeenCalled();
  });

  it('analyzes matching plugin files and forwards plugin progress', async () => {
    const onProgress = vi.fn();
    const persistCache = vi.fn();
    const persistIndexMetadata = vi.fn();
    const discoveredFiles = [
      createDiscoveredFile('README.md'),
      createDiscoveredFile('src/app.ts'),
    ];
    const source = createSource({
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[], _workspaceRoot, onFileProgress) => {
        onFileProgress?.({
          current: 1,
          filePath: '/workspace/src/app.ts',
          total: files.length,
        });
        return createAnalysisResult(files);
      }),
    });

    await refreshWorkspaceIndexPluginFiles(source, {
      disabledPlugins: new Set(),
      discoveredFiles,
      onProgress,
      persistCache,
      persistIndexMetadata,
      pluginIds: ['codegraphy.typescript'],
      pluginInfos: [createPluginInfo('codegraphy.typescript', ['.ts'])],
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._analyzeFiles).toHaveBeenCalledWith(
      [createDiscoveredFile('src/app.ts')],
      '/workspace',
      expect.any(Function),
      undefined,
      ['codegraphy.typescript'],
      new Set(),
      { forceAnalyze: true },
    );
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Applying Plugin',
      current: 0,
      total: 1,
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Applying Plugin',
      current: 1,
      total: 1,
    });
    expect(persistCache).toHaveBeenCalledOnce();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();
  });

  it('forces selected plugin files through analysis and patches only those cache rows', async () => {
    const persistCache = vi.fn();
    const persistCachePatch = vi.fn();
    const discoveredFiles = [
      createDiscoveredFile('README.md'),
      createDiscoveredFile('src/app.ts'),
      createDiscoveredFile('src/extra.ts'),
    ];
    const source = createSource({
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[]) => createAnalysisResult(files)),
    });

    await refreshWorkspaceIndexPluginFiles(source, {
      disabledPlugins: new Set(),
      discoveredFiles,
      persistCache,
      persistCachePatch,
      persistIndexMetadata: vi.fn(),
      pluginIds: ['codegraphy.typescript'],
      pluginInfos: [createPluginInfo('codegraphy.typescript', ['.ts'])],
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._analyzeFiles).toHaveBeenCalledWith(
      [createDiscoveredFile('src/app.ts'), createDiscoveredFile('src/extra.ts')],
      '/workspace',
      expect.any(Function),
      undefined,
      ['codegraphy.typescript'],
      new Set(),
      { forceAnalyze: true },
    );
    expect(persistCachePatch).toHaveBeenCalledWith({
      deleteFilePaths: [],
      upsertFilePaths: ['src/app.ts', 'src/extra.ts'],
    });
    expect(persistCache).not.toHaveBeenCalled();
  });

  it('does not require a plugin progress callback', async () => {
    const source = createSource({
      _analyzeFiles: vi.fn(async (files: IDiscoveredFile[], _workspaceRoot, onFileProgress) => {
        onFileProgress?.({
          current: 1,
          filePath: '/workspace/src/app.ts',
          total: files.length,
        });
        return createAnalysisResult(files);
      }),
    });

    await expect(refreshWorkspaceIndexPluginFiles(source, {
      disabledPlugins: new Set(),
      discoveredFiles: [createDiscoveredFile('src/app.ts')],
      onProgress: undefined,
      persistCache: vi.fn(),
      persistIndexMetadata: vi.fn(),
      pluginIds: ['codegraphy.typescript'],
      pluginInfos: [createPluginInfo('codegraphy.typescript', ['.ts'])],
      signal: undefined,
      workspaceRoot: '/workspace',
    })).resolves.toBeDefined();
    expect(source._analyzeFiles).toHaveBeenCalledOnce();
  });
});

function createPluginInfo(id: string, supportedExtensions: readonly string[]) {
  return {
    plugin: {
      id,
      supportedExtensions,
    },
  };
}

function createAnalysisResult(files: IDiscoveredFile[]) {
  return {
    cacheHits: 0,
    cacheMisses: files.length,
    fileAnalysis: new Map<string, IFileAnalysisResult>(
      files.map(file => [
        file.relativePath,
        createFileAnalysis(file.absolutePath),
      ]),
    ),
    fileConnections: new Map(files.map(file => [file.relativePath, []])),
  };
}
