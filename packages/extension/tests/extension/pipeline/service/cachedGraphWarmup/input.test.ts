import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorkspacePluginAnalysisContext,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  type IDiscoveredFile,
} from '@codegraphy-dev/core';
import { createWorkspacePipelineAnalysisCacheTiers } from '../../../../../src/extension/pipeline/service/cache/tiers';
import { createCachedGraphAnalysisWarmupInput } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/input';
import { selectCachedGraphAnalysisWarmupFile } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/selection';
import type { CachedGraphAnalysisWarmupOptions } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/contracts';

vi.mock('@codegraphy-dev/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codegraphy-dev/core')>();
  return {
    ...actual,
    createWorkspacePluginAnalysisContext: vi.fn((workspaceRoot, options) => ({
      options,
      workspaceRoot,
    })),
  };
});

vi.mock('../../../../../src/extension/pipeline/service/cache/tiers', () => ({
  createWorkspacePipelineAnalysisCacheTiers: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cachedGraphWarmup/selection', () => ({
  selectCachedGraphAnalysisWarmupFile: vi.fn(),
}));

const selectedFile = {
  absolutePath: '/workspace/src/a.ts',
  relativePath: 'src/a.ts',
} as IDiscoveredFile;

function createOptions(
  overrides: Partial<CachedGraphAnalysisWarmupOptions> = {},
): CachedGraphAnalysisWarmupOptions {
  return {
    disabledPlugins: new Set(['plugin.disabled']),
    files: [selectedFile],
    getActiveAnalysisPluginIds: vi.fn(() => ['plugin.active']),
    registry: {
      analyzeFileResultForPlugins: vi.fn(),
      supportsFile: vi.fn(() => true),
    },
    signal: new AbortController().signal,
    workspaceRoot: '/workspace',
    ...overrides,
  };
}

describe('extension/pipeline/service/cachedGraphWarmup/input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(selectCachedGraphAnalysisWarmupFile).mockReturnValue(selectedFile);
    vi.mocked(createWorkspacePipelineAnalysisCacheTiers).mockReturnValue({
      active: undefined,
    } as never);
  });

  it('does not build input when the registry cannot analyze warmup files', () => {
    const options = createOptions({
      registry: { supportsFile: vi.fn(() => true) },
    });

    expect(createCachedGraphAnalysisWarmupInput(options)).toBeUndefined();
    expect(selectCachedGraphAnalysisWarmupFile).not.toHaveBeenCalled();
  });

  it('does not build input when no warmup file can be selected', () => {
    vi.mocked(selectCachedGraphAnalysisWarmupFile).mockReturnValue(undefined);
    const options = createOptions();

    expect(createCachedGraphAnalysisWarmupInput(options)).toBeUndefined();
    expect(selectCachedGraphAnalysisWarmupFile).toHaveBeenCalledWith(
      options.registry,
      [selectedFile],
    );
  });

  it('builds warmup input with a disabled-plugin snapshot and plugin analysis context', () => {
    const options = createOptions();

    const input = createCachedGraphAnalysisWarmupInput(options);

    expect(options.getActiveAnalysisPluginIds).toHaveBeenCalledWith(new Set(['plugin.disabled']));
    expect(createWorkspacePipelineAnalysisCacheTiers).toHaveBeenCalledWith(
      ['plugin.active'],
    );
    expect(createWorkspacePluginAnalysisContext).toHaveBeenCalledWith('/workspace', {
      features: { symbols: true },
    });
    expect(input).toEqual({
      analysisContext: {
        options: { features: { symbols: true } },
        workspaceRoot: '/workspace',
      },
      disabledPluginSnapshot: new Set(['plugin.disabled']),
      file: selectedFile,
      pluginIds: ['plugin.active'],
      signal: options.signal,
      workspaceRoot: '/workspace',
    });
    expect(input?.disabledPluginSnapshot).not.toBe(options.disabledPlugins);
  });

  it('enables symbols only when the active cache tiers include symbol analysis', () => {
    vi.mocked(createWorkspacePipelineAnalysisCacheTiers).mockReturnValueOnce({
      active: ['baseline'],
    } as never);
    createCachedGraphAnalysisWarmupInput(createOptions());
    expect(createWorkspacePluginAnalysisContext).toHaveBeenLastCalledWith('/workspace', {
      features: { symbols: false },
    });

    vi.mocked(createWorkspacePipelineAnalysisCacheTiers).mockReturnValueOnce({
      active: [SYMBOLS_ANALYSIS_CACHE_TIER],
    } as never);
    createCachedGraphAnalysisWarmupInput(createOptions());
    expect(createWorkspacePluginAnalysisContext).toHaveBeenLastCalledWith('/workspace', {
      features: { symbols: true },
    });
  });
});
