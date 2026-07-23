import { describe, expect, it } from 'vitest';
import { isGraphEdgeTypeLike } from '../../../../../src/extension/graphView/controls/send/definitions/edgeGuard';

describe('extension/graphView/controls/send/definitions/edgeGuard', () => {
  it('accepts edge definitions with the required string and boolean fields', () => {
    expect(
      isGraphEdgeTypeLike({
        id: 'import',
        label: 'Import',
        defaultVisible: true,
      }),
    ).toBe(true);
  });

  it('accepts edge definitions with optional tooltip descriptions and examples', () => {
    expect(
      isGraphEdgeTypeLike({
        id: 'plugin:route',
        label: 'Route Links',
        defaultVisible: true,
        description: {
          description: 'A route points at the file that renders it.',
          examples: [{ label: 'SvelteKit', code: 'src/routes/+page.svelte' }],
        },
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
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphEdgeTypeLike({
        id: 'import',
        label: 123,
        defaultVisible: true,
      }),
    ).toBe(false);
    expect(
      isGraphEdgeTypeLike({
        id: 'import',
        label: 'Import',
        defaultVisible: 'yes',
      }),
    ).toBe(false);
    expect(
      isGraphEdgeTypeLike({
        id: 'plugin:route',
        label: 'Route Links',
        defaultVisible: true,
        description: {
          examples: [{ label: 'SvelteKit', code: 'src/routes/+page.svelte' }],
        },
      }),
    ).toBe(false);
  });
});
