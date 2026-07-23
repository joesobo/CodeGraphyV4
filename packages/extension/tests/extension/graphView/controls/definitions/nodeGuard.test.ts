import { describe, expect, it } from 'vitest';
import { isGraphNodeTypeLike } from '../../../../../src/extension/graphView/controls/send/definitions/nodeGuard';

describe('extension/graphView/controls/send/definitions/nodeGuard', () => {
  it('accepts node definitions with the required string and boolean fields', () => {
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: 'Route',
        defaultVisible: false,
      }),
    ).toBe(true);
  });

  it('accepts node definitions with optional tooltip descriptions and examples', () => {
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: 'Route',
        defaultVisible: false,
        description: {
          description: 'Application routes exposed by a framework.',
          examples: [{ label: 'SvelteKit', code: 'src/routes/+page.svelte' }],
        },
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
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: {},
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: 'Route',
        defaultVisible: 1,
      }),
    ).toBe(false);
    expect(
      isGraphNodeTypeLike({
        id: 'route',
        label: 'Route',
        defaultVisible: true,
        description: {
          description: 'Application routes exposed by a framework.',
          examples: [{ label: 'SvelteKit' }],
        },
      }),
    ).toBe(false);
  });
});
