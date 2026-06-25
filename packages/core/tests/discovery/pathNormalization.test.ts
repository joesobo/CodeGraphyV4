import { describe, expect, it } from 'vitest';
import { normalizeDiscoveryPath } from '../../src/discovery/pathNormalization';

describe('discovery/pathNormalization', () => {
  it('converts Windows path separators to forward slashes', () => {
    expect(normalizeDiscoveryPath('src\\nested\\file.ts')).toBe('src/nested/file.ts');
  });

  it('leaves normalized paths unchanged', () => {
    expect(normalizeDiscoveryPath('src/nested/file.ts')).toBe('src/nested/file.ts');
  });
});
