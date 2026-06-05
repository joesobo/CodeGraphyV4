import { describe, expect, it } from 'vitest';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../../src/extension/config/excludePatterns';

describe('config/excludePatterns', () => {
  it('keeps dependency and build artifact defaults available without loading workspace packages', () => {
    expect(DEFAULT_EXCLUDE_PATTERNS).toEqual(expect.arrayContaining([
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/.codegraphy/**',
    ]));
  });
});
