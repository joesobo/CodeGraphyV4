import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { setupFingerprint } from '../../src/scrap/setupFingerprint';

function parseStatements(source: string): ts.Statement[] {
  const sourceFile = ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return [...sourceFile.statements];
}

describe('setupFingerprint', () => {
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
