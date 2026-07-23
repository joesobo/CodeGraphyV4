import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readCodeGraphyWorkspaceStatus } from '@codegraphy-dev/core';
import { getWorkspacePipelineIndexStatus } from '../../../../src/extension/pipeline/service/indexStatus';

vi.mock('@codegraphy-dev/core', () => ({
  readCodeGraphyWorkspaceStatus: vi.fn(),
}));

const missingIndexStatus = {
  freshness: 'missing',
  detail: 'CodeGraphy index is missing. Index the workspace to build the graph.',
};

describe('extension/pipeline/service/indexStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readCodeGraphyWorkspaceStatus).mockReturnValue({
      detail: 'CodeGraphy index is fresh.',
      state: 'fresh',
    } as never);
  });

  it('reports a missing index without probing storage when no workspace is open', () => {
    const hasIndex = vi.fn(() => true);

    expect(getWorkspacePipelineIndexStatus({
      hasIndex,
      pluginBuildSignature: 'plugin-build',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
      workspaceRoot: undefined,
    })).toEqual(missingIndexStatus);
    expect(hasIndex).not.toHaveBeenCalled();
    expect(readCodeGraphyWorkspaceStatus).not.toHaveBeenCalled();
  });

  it('reports a missing index without reading status when no index exists', () => {
    const hasIndex = vi.fn(() => false);

    expect(getWorkspacePipelineIndexStatus({
      hasIndex,
      pluginBuildSignature: 'plugin-build',
      pluginSignature: 'plugins',
      settingsSignature: 'settings',
      workspaceRoot: '/workspace',
    })).toEqual(missingIndexStatus);
    expect(hasIndex).toHaveBeenCalledOnce();
    expect(readCodeGraphyWorkspaceStatus).not.toHaveBeenCalled();
  });

  it('reads and returns the workspace status with current signatures', () => {
    const hasIndex = vi.fn(() => true);
    vi.mocked(readCodeGraphyWorkspaceStatus).mockReturnValue({
      detail: 'Plugin signature changed.',
      state: 'stale',
    } as never);

    expect(getWorkspacePipelineIndexStatus({
      hasIndex,
      pluginBuildSignature: 'plugin-build',
      pluginSignature: null,
      settingsSignature: 'settings',
      workspaceRoot: '/workspace',
    })).toEqual({
      freshness: 'stale',
      detail: 'Plugin signature changed.',
    });
    expect(hasIndex).toHaveBeenCalledOnce();
    expect(readCodeGraphyWorkspaceStatus).toHaveBeenCalledWith('/workspace', {
      pluginBuildSignature: 'plugin-build',
      pluginSignature: null,
      settingsSignature: 'settings',
    });
  });
});
