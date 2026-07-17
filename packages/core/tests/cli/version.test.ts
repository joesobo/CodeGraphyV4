import { describe, expect, it } from 'vitest';
import { readCliVersion } from '../../src/cli/version';

describe('cli/version', () => {
  it('reads the packaged Core version', () => {
    expect(readCliVersion()).toMatch(/^\d+\.\d+\.\d+(?:[-+].+)?$/);
  });
});
