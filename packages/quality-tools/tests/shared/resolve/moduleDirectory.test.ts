import { describe, expect, it } from 'vitest';
import { moduleDirectory } from '../../../src/shared/resolve/moduleDirectory';

describe('moduleDirectory', () => {
  it('returns undefined without a module url', () => {
    expect(moduleDirectory()).toBeUndefined();
  });

  it('handles file urls', () => {
    expect(moduleDirectory('file:///repo/packages/quality-tools/src/shared/resolve/repoRoot.ts')).toBe(
      '/repo/packages/quality-tools/src/shared/resolve'
    );
  });

  it('handles absolute module paths', () => {
    expect(moduleDirectory('/repo/packages/quality-tools/src/shared/resolve/repoRoot.ts')).toBe(
      '/repo/packages/quality-tools/src/shared/resolve'
    );
  });

  it('ignores unsupported module urls', () => {
    expect(moduleDirectory('https://example.com/repoRoot.ts')).toBeUndefined();
  });
});
