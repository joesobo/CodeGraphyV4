import { describe, expect, it } from 'vitest';
import { computeAccessCountSizes } from '../../../../../src/webview/components/graph/model/sizing/accessCount';

describe('graph/model/sizing/accessCount', () => {
  it('scales nodes between the configured min and max node sizes', () => {
    const sizes = computeAccessCountSizes([
      { id: 'low', label: 'low', color: '#fff', accessCount: 1 },
      { id: 'high', label: 'high', color: '#fff', accessCount: 5 },
    ] as never);

    expect(sizes.get('low')).toBe(16);
    expect(sizes.get('high')).toBe(40);
  });
});
