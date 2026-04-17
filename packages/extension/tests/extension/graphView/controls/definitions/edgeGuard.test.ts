import { describe, expect, it } from 'vitest';
import { isGraphEdgeTypeLike } from '../../../../../src/extension/graphView/controls/send/definitions/edgeGuard';

describe('extension/graphView/controls/send/definitions/edgeGuard', () => {
  it('accepts edge definitions with the required string and boolean fields', () => {
    expect(
      isGraphEdgeTypeLike({
        id: 'import',
        label: 'Import',
        defaultColor: '#3178C6',
        defaultVisible: true,
      }),
    ).toBe(true);
  });

  it('rejects nullish and non-object edge definitions', () => {
    expect(isGraphEdgeTypeLike(null)).toBe(false);
    expect(isGraphEdgeTypeLike(undefined)).toBe(false);
    expect(isGraphEdgeTypeLike('import')).toBe(false);
    expect(isGraphEdgeTypeLike(42)).toBe(false);
  });

  it('rejects edge definitions with missing or invalid required fields', () => {
    expect(
      isGraphEdgeTypeLike({
        label: 'Import',
        defaultColor: '#3178C6',
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphEdgeTypeLike({
        id: 'import',
        label: 123,
        defaultColor: '#3178C6',
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphEdgeTypeLike({
        id: 'import',
        label: 'Import',
        defaultColor: 123,
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphEdgeTypeLike({
        id: 'import',
        label: 'Import',
        defaultColor: '#3178C6',
        defaultVisible: 'yes',
      }),
    ).toBe(false);
  });
});
