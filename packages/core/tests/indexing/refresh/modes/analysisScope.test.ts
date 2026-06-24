import { describe, expect, it, vi } from 'vitest';

import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../../../../src/discovery/contracts';
import { refreshWorkspaceIndexAnalysisScope } from '../../../../src/indexing/refresh';
import {
  createDiscoveredFile,
  createFileAnalysis,
  createSource,
} from '../fixture';

describe('indexing/refresh/modes/analysisScope', () => {
  it('records discovery state and forwards analysis progress as scope progress', async () => {
    const onProgress = vi.fn();
    const persistCache = vi.fn();
    const persistIndexMetadata = vi.fn();
    const discoveredFiles = [
      createDiscoveredFile('src/app.ts'),
      createDiscoveredFile('src/dep.ts'),
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

    await refreshWorkspaceIndexAnalysisScope(source, {
      disabledPlugins: new Set(),
      discoveredDirectories: ['src'],
      discoveredFiles,
      onProgress,
      persistCache,
      persistIndexMetadata,
      signal: undefined,
      workspaceRoot: '/workspace',
    });

    expect(source._lastDiscoveredDirectories).toEqual(['src']);
    expect(source._lastDiscoveredFiles).toEqual(discoveredFiles);
    expect(source._analyzeFiles).toHaveBeenCalledWith(
      discoveredFiles,
      '/workspace',
      expect.any(Function),
      undefined,
      undefined,
      new Set(),
    );
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Applying Scope',
      current: 0,
      total: 2,
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Applying Scope',
      current: 1,
      total: 2,
    });
    expect(persistCache).toHaveBeenCalledOnce();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();
  });

  it('does not require a scope progress callback', async () => {
    const discoveredFiles = [createDiscoveredFile('src/app.ts')];
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

    await expect(refreshWorkspaceIndexAnalysisScope(source, {
      disabledPlugins: new Set(),
      discoveredFiles,
      onProgress: undefined,
      persistCache: vi.fn(),
      persistIndexMetadata: vi.fn(),
      signal: undefined,
      workspaceRoot: '/workspace',
    })).resolves.toBeDefined();
    expect(source._analyzeFiles).toHaveBeenCalledOnce();
  });
});

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
