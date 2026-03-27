import { describe, expect, it } from 'vitest';
import { setupFingerprint } from '../../src/scrap/setupFingerprint';
import { parseStatements } from './setupFingerprintTestHelpers';

describe('setupFingerprint structure', () => {
  it('serializes statement and child structure with stable separators', () => {
    expect(setupFingerprint(parseStatements(`
      const value = createValue('a');
      vi.mock('./alpha');
    `))).toBe('244[262[261[id,214[id,lit]]]]|245[214[212[id,id],lit]]');
  });

  it('returns different fingerprints for structurally different setup', () => {
    const first = parseStatements(`
      const value = createValue('a');
      vi.mock('./alpha');
    `);
    const second = parseStatements(`
      vi.mock('./alpha');
    `);

    expect(setupFingerprint(first)).not.toBe(setupFingerprint(second));
  });

  it('preserves structural nesting for different statement shapes', () => {
    const straightCall = parseStatements(`
      vi.mock('./alpha');
    `);
    const conditionalCall = parseStatements(`
      if (flag) {
        vi.mock('./alpha');
      }
    `);

    expect(setupFingerprint(straightCall)).not.toBe(setupFingerprint(conditionalCall));
  });

  it('serializes conditional setup with its normalized child shape', () => {
    expect(setupFingerprint(parseStatements(`
      if (flag) {
        vi.mock('./thing');
      }
    `))).toBe('246[id,242[245[214[212[id,id],lit]]]]');
  });
});
