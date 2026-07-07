import { describe, expect, it } from 'vitest';
import {
  compareGraphArrayValues,
  compareGraphRecordValues,
} from '../../../../../../../src/extension/graphView/analysis/execution/publish/equality/collections';

const comparePrimitiveValue = (left: unknown, right: unknown) => Object.is(left, right);

describe('extension/graphView/analysis/execution/publish/equality/collections', () => {
  it('compares arrays by length and every indexed value', () => {
    expect(compareGraphArrayValues([1, 2], [1, 2], comparePrimitiveValue)).toBe(true);
    expect(compareGraphArrayValues([1, 2], [1], comparePrimitiveValue)).toBe(false);
    expect(compareGraphArrayValues([1], [1, 2], comparePrimitiveValue)).toBe(false);
    expect(compareGraphArrayValues([1, 2], [1, 3], comparePrimitiveValue)).toBe(false);
  });

  it('distinguishes one-sided arrays from non-array pairs', () => {
    expect(compareGraphArrayValues([1], { 0: 1 }, comparePrimitiveValue)).toBe(false);
    expect(compareGraphArrayValues([1], '1', comparePrimitiveValue)).toBe(false);
    expect(compareGraphArrayValues('1', [1], comparePrimitiveValue)).toBe(false);
    expect(compareGraphArrayValues('left', 'right', comparePrimitiveValue)).toBeUndefined();
  });

  it('compares records by every key from both records', () => {
    expect(compareGraphRecordValues(
      { id: 'src/a.ts', kind: 'file' },
      { kind: 'file', id: 'src/a.ts' },
      comparePrimitiveValue,
    )).toBe(true);
    expect(compareGraphRecordValues({ id: 'src/a.ts' }, { id: 'src/b.ts' }, comparePrimitiveValue)).toBe(false);
    expect(compareGraphRecordValues({ id: 'src/a.ts' }, { id: 'src/a.ts', extra: true }, comparePrimitiveValue)).toBe(false);
  });

  it('treats missing graph payload keys like explicit undefined values', () => {
    expect(compareGraphRecordValues({}, { extra: undefined }, comparePrimitiveValue)).toBe(true);
    expect(compareGraphRecordValues({ leftKey: undefined }, { rightKey: undefined }, comparePrimitiveValue)).toBe(true);
  });

  it('rejects nulls and one-sided records', () => {
    expect(compareGraphRecordValues(null, {}, comparePrimitiveValue)).toBe(false);
    expect(compareGraphRecordValues({ id: 'src/a.ts' }, ['src/a.ts'], comparePrimitiveValue)).toBe(false);
  });
});
