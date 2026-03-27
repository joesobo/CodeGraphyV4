import { describe, expect, it } from 'vitest';
import { setupFingerprint } from '../../src/scrap/setupFingerprint';
import { parseStatements } from './setupFingerprintTestHelpers';

describe('setupFingerprint order', () => {
  it('preserves statement order in multi-statement setup', () => {
    const first = parseStatements(`
      const value = createValue('a');
      vi.mock('./alpha');
    `);
    const reversed = parseStatements(`
      vi.mock('./alpha');
      const value = createValue('a');
    `);

    expect(setupFingerprint(first)).not.toBe(setupFingerprint(reversed));
  });

  it('returns undefined for empty setup', () => {
    expect(setupFingerprint([])).toBeUndefined();
  });
});
