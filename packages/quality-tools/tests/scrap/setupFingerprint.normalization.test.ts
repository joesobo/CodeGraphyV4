import { describe, expect, it } from 'vitest';
import { setupFingerprint } from '../../src/scrap/setupFingerprint';
import { parseStatements } from './setupFingerprintTestHelpers';

describe('setupFingerprint normalization', () => {
  it('normalizes identifier and literal differences for structurally identical setup', () => {
    const first = parseStatements(`
      const firstValue = createValue('a');
      vi.mock('./alpha');
    `);
    const second = parseStatements(`
      const secondValue = createValue('b');
      vi.mock('./beta');
    `);

    expect(setupFingerprint(first)).toBe(setupFingerprint(second));
  });

  it('normalizes string, number, boolean, and null literals into the same structure', () => {
    const stringFingerprint = setupFingerprint(parseStatements(`const value = 'name';`));

    expect(setupFingerprint(parseStatements(`const value = 3;`))).toBe(stringFingerprint);
    expect(setupFingerprint(parseStatements(`const value = true;`))).toBe(stringFingerprint);
    expect(setupFingerprint(parseStatements(`const value = false;`))).toBe(stringFingerprint);
    expect(setupFingerprint(parseStatements(`const value = null;`))).toBe(stringFingerprint);
  });

  it('keeps normalized literal declarations structurally identical', () => {
    expect(setupFingerprint(parseStatements(`
      const enabled = true;
      const disabled = false;
      const missing = null;
      const count = 3;
      const label = 'name';
    `))).toBe(
      '244[262[261[id,lit]]]|244[262[261[id,lit]]]|244[262[261[id,lit]]]|244[262[261[id,lit]]]|244[262[261[id,lit]]]'
    );
  });
});
