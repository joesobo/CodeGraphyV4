import { describe, expect, it } from 'vitest';
import { computeFileSizeSizes } from '../../../../../src/webview/components/graph/model/sizing/fileSize';

describe('graph/model/sizing/fileSize', () => {
  it('returns defaults when every node has a zero file size', () => {
    const sizes = computeFileSizeSizes([
      { id: 'a', label: 'a', color: '#fff', fileSize: 0 },
      { id: 'b', label: 'b', color: '#fff' },
    ] as never);

    expect(sizes.get('a')).toBe(16);
    expect(sizes.get('b')).toBe(16);
  });

  it('scales positive sizes logarithmically and keeps empty sizes at the minimum', () => {
    const sizes = computeFileSizeSizes([
      { id: 'zero', label: 'zero', color: '#fff', fileSize: 0 },
      { id: 'small', label: 'small', color: '#fff', fileSize: 9 },
      { id: 'large', label: 'large', color: '#fff', fileSize: 9999 },
    ] as never);

    expect(sizes.get('zero')).toBe(10);
    expect(sizes.get('small')).toBeGreaterThan(8);
    expect(sizes.get('large')).toBe(40);
  });
});
