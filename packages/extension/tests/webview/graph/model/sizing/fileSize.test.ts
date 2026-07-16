import { describe, expect, it } from 'vitest';
import { computeFileSizeSizes } from '../../../../../src/webview/components/graph/model/sizing/fileSize';

describe('graph/model/sizing/fileSize', () => {
  it('uses the shared minimum when file size cannot distinguish nodes', () => {
    const sizes = computeFileSizeSizes([
      { id: 'missing', label: 'missing', color: '#fff' },
      { id: 'zero', label: 'zero', color: '#fff', fileSize: 0 },
      { id: 'same-a', label: 'same-a', color: '#fff', fileSize: 100 },
      { id: 'same-b', label: 'same-b', color: '#fff', fileSize: 100 },
    ] as never);

    for (const size of sizes.values()) expect(size).toBe(8);
  });

  it('scales distinguishable positive sizes logarithmically into the shared range', () => {
    const sizes = computeFileSizeSizes([
      { id: 'zero', label: 'zero', color: '#fff', fileSize: 0 },
      { id: 'small', label: 'small', color: '#fff', fileSize: 9 },
      { id: 'medium', label: 'medium', color: '#fff', fileSize: 99 },
      { id: 'large', label: 'large', color: '#fff', fileSize: 9999 },
    ] as never);

    expect(sizes.get('zero')).toBe(8);
    expect(sizes.get('small')).toBe(8);
    expect(sizes.get('medium')).toBeGreaterThan(8);
    expect(sizes.get('medium')).toBeLessThan(30);
    expect(sizes.get('large')).toBe(30);
  });
});
