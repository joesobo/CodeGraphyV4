import { describe, expect, it, vi } from 'vitest';
import {
  analyzeWorkspaceAnalyzerFiles,
  analyzeWorkspaceAnalyzerSourceFiles,
} from '../../../src/extension/workspaceAnalyzer/files';
import * as workspaceFileAnalysisModule from '../../../src/extension/workspaceFileAnalysis';

describe('workspaceAnalyzer/files', () => {
  it('logs cache hit and miss counts from workspace file analysis', async () => {
    vi.spyOn(workspaceFileAnalysisModule, 'analyzeWorkspaceFiles').mockResolvedValue({
      cacheHits: 2,
      cacheMisses: 3,
      fileConnections: new Map([['src/index.ts', []]]),
    });
    const logInfo = vi.fn();

    const result = await analyzeWorkspaceAnalyzerFiles({
      analyzeFile: vi.fn(async () => []),
      cache: { files: {}, version: '1' } as never,
      files: [],
      getFileStat: vi.fn(async () => null),
      logInfo,
      readContent: vi.fn(async () => ''),
      workspaceRoot: '/workspace',
    });

    expect(result).toEqual(new Map([['src/index.ts', []]]));
    expect(logInfo).toHaveBeenCalledWith(
      '[CodeGraphy] Analysis: 2 cache hits, 3 misses',
    );
  });

  it('creates source-backed adapters for file analysis and event emission', async () => {
    const source = {
      _cache: { files: {}, version: '1' },
      _discovery: {
        readContent: vi.fn(async () => "import './utils'"),
      },
      _eventBus: {
        emit: vi.fn(),
      },
      _getFileStat: vi.fn(async () => ({ mtime: 10, size: 5 })),
      _registry: {
        analyzeFile: vi.fn(async () => []),
      },
    };
    const analyzeWorkspaceFilesSpy = vi
      .spyOn(workspaceFileAnalysisModule, 'analyzeWorkspaceFiles')
      .mockResolvedValue({
        cacheHits: 1,
        cacheMisses: 0,
        fileConnections: new Map(),
      });

    await analyzeWorkspaceAnalyzerSourceFiles(
      source as never,
      [
        {
          absolutePath: '/workspace/src/index.ts',
          relativePath: 'src/index.ts',
        },
      ],
      '/workspace',
      vi.fn(),
    );

    const options = analyzeWorkspaceFilesSpy.mock.calls[0][0];
    await options.analyzeFile('/workspace/src/index.ts', "import './utils'", '/workspace');
    expect(source._registry.analyzeFile).toHaveBeenCalledWith(
      '/workspace/src/index.ts',
      "import './utils'",
      '/workspace',
    );
    await options.readContent({
      absolutePath: '/workspace/src/index.ts',
      relativePath: 'src/index.ts',
    });
    expect(source._discovery.readContent).toHaveBeenCalledOnce();
    await options.getFileStat('/workspace/src/index.ts');
    expect(source._getFileStat).toHaveBeenCalledWith('/workspace/src/index.ts');
    options.emitFileProcessed?.({
      filePath: 'src/index.ts',
      connections: [],
    });
    expect(source._eventBus.emit).toHaveBeenCalledWith(
      'analysis:fileProcessed',
      {
        filePath: 'src/index.ts',
        connections: [],
      },
    );
  });
});
