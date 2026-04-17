import { describe, expect, it } from 'vitest';
import { isGraphNodeTypeLike } from '../../../../../src/extension/graphView/controls/send/definitions/nodeGuard';

describe('extension/graphView/controls/send/definitions/nodeGuard', () => {
  it('accepts node definitions with the required string and boolean fields', () => {
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: 'Route',
        defaultColor: '#22C55E',
        defaultVisible: false,
      }),
    ).toBe(true);
  });

  it('rejects nullish and non-object node definitions', () => {
    expect(isGraphNodeTypeLike(null)).toBe(false);
    expect(isGraphNodeTypeLike(undefined)).toBe(false);
    expect(isGraphNodeTypeLike('route')).toBe(false);
    expect(isGraphNodeTypeLike(false)).toBe(false);
  });

  it('rejects node definitions with missing or invalid required fields', () => {
    expect(
      isGraphNodeTypeLike({
        label: 'Route',
        defaultColor: '#22C55E',
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: {},
        defaultColor: '#22C55E',
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: 'Route',
        defaultColor: null,
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: 'Route',
        defaultColor: '#22C55E',
        defaultVisible: 1,
      }),
    ).toBe(false);
  });
});
