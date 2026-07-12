import { describe, expect, it } from 'vitest';
import { computeChurnSizes } from '../../../../../../src/webview/components/graph/model/sizing/churn/count';

describe('computeChurnSizes', () => {
  it('scales commit-touch counts while keeping every node addressable', () => {
    const sizes = computeChurnSizes([
      { id: 'src/stable.ts', label: 'stable.ts', color: '#ffffff', churn: 1 },
      { id: 'src/active.ts', label: 'active.ts', color: '#ffffff', churn: 20 },
      { id: 'src/unknown.ts', label: 'unknown.ts', color: '#ffffff' },
    ]);

    expect(sizes.get('src/active.ts')).toBeGreaterThan(sizes.get('src/stable.ts') ?? 0);
    expect(sizes.get('src/stable.ts')).toBeGreaterThan(sizes.get('src/unknown.ts') ?? 0);
    expect(sizes.has('src/unknown.ts')).toBe(true);
  });
});
