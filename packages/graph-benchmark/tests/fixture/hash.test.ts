import { describe, expect, it } from 'vitest';

import { hashGraphFixture } from '../../src/fixture/hash';

describe('hashGraphFixture', () => {
  it('canonicalizes object property order', () => {
    const first = {
      nodes: [{ id: 'a', label: 'a.ts', color: '#fff', nodeType: 'file' as const }],
      edges: [],
    };
    const reordered = {
      nodes: [{ nodeType: 'file' as const, color: '#fff', label: 'a.ts', id: 'a' }],
      edges: [],
    };

    expect(hashGraphFixture(first)).toBe(hashGraphFixture(reordered));
    expect(hashGraphFixture(first)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('changes when rendered graph data changes', () => {
    const original = {
      nodes: [{ id: 'a', label: 'a.ts', color: '#fff' }],
      edges: [],
    };
    const renamed = {
      nodes: [{ id: 'a', label: 'renamed.ts', color: '#fff' }],
      edges: [],
    };

    expect(hashGraphFixture(original)).not.toBe(hashGraphFixture(renamed));
  });
});
