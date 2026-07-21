import { describe, expect, it, vi } from 'vitest';
import { createWorkspacePipelineSettingsSignature } from '../../../../src/extension/pipeline/cacheSignatures/settings';

function settings(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    maxFiles: 50,
    include: ['src/**'],
    respectGitignore: true,
    showOrphans: true,
    filterPatterns: ['dist/**'],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
    plugins: [{ id: 'codegraphy.vue', enabled: true, options: { includeTests: true } }],
    ...overrides,
  };
}

describe('workspace pipeline settings signature', () => {
  it('includes workspace plugin settings but excludes query-only Filters', () => {
    const config = { getAll: vi.fn(() => settings()) };
    const signature = createWorkspacePipelineSettingsSignature(config as never);

    expect(config.getAll).toHaveBeenCalledOnce();
    expect(signature).toBe(createWorkspacePipelineSettingsSignature({
      getAll: () => settings({ filterPatterns: [] }),
    } as never));
    expect(signature).not.toBe(createWorkspacePipelineSettingsSignature({
      getAll: () => settings({ plugins: [] }),
    } as never));
  });

  it('normalizes partial settings snapshots before hashing them', () => {
    expect(() => createWorkspacePipelineSettingsSignature({
      getAll: () => ({ showOrphans: true, respectGitignore: true }),
    } as never)).not.toThrow();
  });
});
