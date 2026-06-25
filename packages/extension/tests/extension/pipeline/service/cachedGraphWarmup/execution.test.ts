import { beforeEach, describe, expect, it, vi } from 'vitest';
import { throwIfWorkspaceAnalysisAborted, type IDiscoveredFile } from '@codegraphy-dev/core';
import { warmCachedGraphAnalysisFile } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/execution';
import type { CachedGraphAnalysisWarmupInput } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/contracts';

vi.mock('@codegraphy-dev/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codegraphy-dev/core')>();
  return {
    ...actual,
    throwIfWorkspaceAnalysisAborted: vi.fn(),
  };
});

const file = {
  absolutePath: '/workspace/src/a.ts',
  relativePath: 'src/a.ts',
} as IDiscoveredFile;

function createInput(): CachedGraphAnalysisWarmupInput {
  return {
    analysisContext: { workspaceRoot: '/workspace' } as never,
    disabledPluginSnapshot: new Set(['plugin.disabled']),
    file,
    pluginIds: ['plugin.active'],
    signal: new AbortController().signal,
    workspaceRoot: '/workspace',
  };
}

describe('extension/pipeline/service/cachedGraphWarmup/execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not read files when the registry cannot analyze warmup results', async () => {
    const discovery = { readContent: vi.fn() };

    await warmCachedGraphAnalysisFile(createInput(), discovery, {});

    expect(discovery.readContent).not.toHaveBeenCalled();
    expect(throwIfWorkspaceAnalysisAborted).not.toHaveBeenCalled();
  });

  it('reads content and analyzes the selected warmup file with abort checks', async () => {
    const input = createInput();
    const discovery = { readContent: vi.fn(async () => 'content') };
    const analyzeFileResultForPlugins = vi.fn(async () => undefined);

    await warmCachedGraphAnalysisFile(input, discovery, { analyzeFileResultForPlugins });

    expect(throwIfWorkspaceAnalysisAborted).toHaveBeenNthCalledWith(1, input.signal);
    expect(discovery.readContent).toHaveBeenCalledWith(file);
    expect(throwIfWorkspaceAnalysisAborted).toHaveBeenNthCalledWith(2, input.signal);
    expect(analyzeFileResultForPlugins).toHaveBeenCalledWith(
      '/workspace/src/a.ts',
      'content',
      '/workspace',
      ['plugin.active'],
      input.analysisContext,
      { disabledPlugins: new Set(['plugin.disabled']) },
    );
  });
});
