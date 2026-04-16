import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '../../../../src/core/discovery/contracts';
import type { IFileAnalysisResult } from '../../../../src/core/plugins/types/contracts';
import {
  analyzeWorkspacePipelineFiles,
  analyzeWorkspacePipelineSourceFiles,
} from '../../../../src/extension/pipeline/analysis/files';
import * as workspaceFileAnalysisModule from '../../../../src/extension/pipeline/fileAnalysis';

function createDiscoveredFile(relativePath: string): IDiscoveredFile {
  const extensionIndex = relativePath.lastIndexOf('.');
  const slashIndex = relativePath.lastIndexOf('/');

  return {
    absolutePath: `/workspace/${relativePath}`,
    extension: extensionIndex >= 0 ? relativePath.slice(extensionIndex) : '',
    name: slashIndex >= 0 ? relativePath.slice(slashIndex + 1) : relativePath,
    relativePath,
  };
}

describe('pipeline/analysis/files', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs cache hit and miss counts from workspace file analysis', async () => {
    vi.spyOn(workspaceFileAnalysisModule, 'analyzeWorkspaceFiles').mockResolvedValue({
      cacheHits: 2,
      cacheMisses: 3,
      fileAnalysis: new Map([
        ['src/index.ts', { filePath: '/workspace/src/index.ts', relations: [] }],
      ]),
      fileConnections: new Map([['src/index.ts', []]]),
    });
    const logInfo = vi.fn();

    const result = await analyzeWorkspacePipelineFiles({
      analyzeFile: vi.fn(async (): Promise<IFileAnalysisResult> => ({
        filePath: '/workspace/src/index.ts',
        relations: [],
      })),
      cache: { files: {}, version: '1' } as never,
      files: [],
      getFileStat: vi.fn(async () => null),
      logInfo,
      readContent: vi.fn(async () => ''),
      workspaceRoot: '/workspace',
    });

    expect(result).toEqual({
      cacheHits: 2,
      cacheMisses: 3,
      fileAnalysis: new Map([
        ['src/index.ts', { filePath: '/workspace/src/index.ts', relations: [] }],
      ]),
      fileConnections: new Map([['src/index.ts', []]]),
    });
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
        analyzeFileResult: vi.fn(async (): Promise<IFileAnalysisResult> => ({
          filePath: '/workspace/src/index.ts',
          relations: [],
        })),
      },
    };
    const analyzeWorkspaceFilesSpy = vi
      .spyOn(workspaceFileAnalysisModule, 'analyzeWorkspaceFiles')
      .mockResolvedValue({
        cacheHits: 1,
        cacheMisses: 0,
        fileAnalysis: new Map(),
        fileConnections: new Map(),
      });

    await analyzeWorkspacePipelineSourceFiles(
      source as never,
      [
        createDiscoveredFile('src/index.ts'),
      ],
      '/workspace',
      vi.fn(),
    );

    const options = analyzeWorkspaceFilesSpy.mock.calls[0][0];
    await options.analyzeFile('/workspace/src/index.ts', "import './utils'", '/workspace');
    expect(source._registry.analyzeFileResult).toHaveBeenCalledWith(
      '/workspace/src/index.ts',
      "import './utils'",
      '/workspace',
    );
    await options.readContent({
      absolutePath: '/workspace/src/index.ts',
      extension: '.ts',
      name: 'index.ts',
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

  it('falls back to an empty relation set when the registry returns no analysis result', async () => {
    const source = {
      _cache: { files: {}, version: '1' },
      _discovery: {
        readContent: vi.fn(async () => "import './utils'"),
      },
      _getFileStat: vi.fn(async () => ({ mtime: 10, size: 5 })),
      _registry: {
        analyzeFileResult: vi.fn(async (): Promise<IFileAnalysisResult | null> => null),
      },
    };
    const analyzeWorkspaceFilesSpy = vi
      .spyOn(workspaceFileAnalysisModule, 'analyzeWorkspaceFiles')
      .mockResolvedValue({
        cacheHits: 0,
        cacheMisses: 1,
        fileAnalysis: new Map(),
        fileConnections: new Map(),
      });

    await analyzeWorkspacePipelineSourceFiles(
      source as never,
      [createDiscoveredFile('src/index.ts')],
      '/workspace',
      vi.fn(),
    );

    const options = analyzeWorkspaceFilesSpy.mock.calls[0][0];
    await expect(
      options.analyzeFile('/workspace/src/index.ts', "import './utils'", '/workspace'),
    ).resolves.toEqual({
      filePath: '/workspace/src/index.ts',
      relations: [],
    });
    expect(options.emitFileProcessed).toBeUndefined();
  });
});
