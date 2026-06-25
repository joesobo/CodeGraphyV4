import { describe, expect, it } from 'vitest';
import { areGraphValuesEqual } from '../../../../../../../src/extension/graphView/analysis/execution/publish/equality/values';

describe('extension/graphView/analysis/execution/publish/equality/values', () => {
  it('treats equal nested array graph values as equal', () => {
    expect(
      areGraphValuesEqual(
        ['src/a.ts', { metrics: [12, 4] }],
        ['src/a.ts', { metrics: [12, 4] }],
      ),
    ).toBe(true);
  });
});
