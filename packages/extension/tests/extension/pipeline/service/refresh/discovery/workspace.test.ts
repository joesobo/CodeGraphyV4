import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { ICodeGraphyConfig } from '../../../../../../src/extension/config/defaults';
import {
  discoverRefreshWorkspaceFiles,
} from '../../../../../../src/extension/pipeline/service/refresh/discovery/workspace';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../../../src/extension/pipeline/service/runtime/discovery';

const vscodeMock = vi.hoisted(() => ({
  showWarningMessage: vi.fn(),
}));

vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vscodeMock.showWarningMessage,
  },
}));

vi.mock('../../../../../../src/extension/pipeline/service/runtime/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

describe('extension/pipeline/service/refresh/discovery/workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspacePipelineDiscoveryDependencies).mockReturnValue('discovery-deps' as never);
  });

  it('discovers the complete workspace without applying query Filters', async () => {
    const config = {
      disabledCustomFilterPatterns: ['dist/**'],
      disabledPluginFilterPatterns: ['plugin.disabled/**'],
      maxFiles: 500,
    } as ICodeGraphyConfig;
    const discoveryResult = {
      directories: ['src'],
      durationMs: 10,
      files: [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }],
      gitIgnoredPaths: new Set<string>(),
      limitReached: true,
      totalFound: 1,
    };
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValue(discoveryResult as never);
    const disabledPlugins = new Set(['plugin.disabled']);
    const discovery = { discover: vi.fn() };
    const signal = new AbortController().signal;
    const getPluginFilterPatterns = vi.fn(() => [
      'plugin.enabled/**',
      'plugin.disabled/**',
    ]);

    const result = await discoverRefreshWorkspaceFiles({
      configReader: { getAll: vi.fn(() => config) },
      disabledPlugins,
      discovery,
      filterPatterns: ['src/**', 'dist/**', 'tests/**'],
      getPluginFilterPatterns,
      signal,
      workspaceRoot: '/workspace',
    });

    expect(createWorkspacePipelineDiscoveryDependencies).toHaveBeenCalledWith(discovery);
    expect(getPluginFilterPatterns).toHaveBeenCalledWith(disabledPlugins);
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      config,
      ['src/**', 'dist/**', 'tests/**'],
      ['plugin.enabled/**', 'plugin.disabled/**'],
      signal,
      expect.any(Function),
    );

    const warningCallback = vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mock.calls[0][6];
    warningCallback('workspace discovery warning');
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('workspace discovery warning');
    expect(result).toEqual({ config, discoveryResult });
  });
});
