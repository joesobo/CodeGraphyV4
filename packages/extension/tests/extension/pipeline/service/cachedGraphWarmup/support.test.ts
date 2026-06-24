import { describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { getSupportedCachedGraphAnalysisWarmupFiles } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/support';

const files = [
  { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
  { absolutePath: '/workspace/src/b.py', relativePath: 'src/b.py' },
] as IDiscoveredFile[];

describe('extension/pipeline/service/cachedGraphWarmup/support', () => {
  it('keeps files supported by absolute or relative path', () => {
    const supportsFile = vi.fn((filePath: string) =>
      filePath === '/workspace/src/a.ts' || filePath === 'src/b.py',
    );

    expect(getSupportedCachedGraphAnalysisWarmupFiles({ supportsFile }, files)).toEqual(files);
    expect(supportsFile).toHaveBeenCalledWith('/workspace/src/a.ts');
    expect(supportsFile).toHaveBeenCalledWith('/workspace/src/b.py');
    expect(supportsFile).toHaveBeenCalledWith('src/b.py');
  });

  it('returns no files when the registry has no support predicate or rejects every path', () => {
    expect(getSupportedCachedGraphAnalysisWarmupFiles({}, files)).toEqual([]);
    expect(getSupportedCachedGraphAnalysisWarmupFiles({ supportsFile: () => false }, files)).toEqual([]);
  });
});
