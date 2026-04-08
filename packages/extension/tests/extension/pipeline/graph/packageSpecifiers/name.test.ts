import { describe, expect, it } from 'vitest';
import { getExternalPackageName } from '../../../../../src/extension/pipeline/graph/packageSpecifiers/name';

describe('pipeline/graph/packageSpecifiers/name', () => {
  it('extracts stable external package names from bare imports', () => {
    expect(getExternalPackageName('fs')).toBe('fs');
    expect(getExternalPackageName('node:fs/promises')).toBe('fs');
    expect(getExternalPackageName('lodash/merge')).toBe('lodash');
    expect(getExternalPackageName('@scope/pkg/subpath')).toBe('@scope/pkg');
  });

  it('returns null for local or unsupported specifiers', () => {
    expect(getExternalPackageName('./local')).toBeNull();
    expect(getExternalPackageName('#internal')).toBeNull();
    expect(getExternalPackageName('fs:node')).toBeNull();
  });
});
