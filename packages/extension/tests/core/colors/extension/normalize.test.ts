import { describe, expect, it } from 'vitest';
import { normalizeExtension } from '../../../../src/core/colors/extension/normalize';

describe('normalizeExtension', () => {
  it('adds a leading dot to extensions without one', () => {
    expect(normalizeExtension('ts')).toBe('.ts');
  });

  it('lowercases extensions', () => {
    expect(normalizeExtension('.TS')).toBe('.ts');
  });

  it('trims whitespace', () => {
    expect(normalizeExtension('  .ts  ')).toBe('.ts');
  });

  it('preserves extensions that already have a leading dot', () => {
    expect(normalizeExtension('.ts')).toBe('.ts');
  });
});
