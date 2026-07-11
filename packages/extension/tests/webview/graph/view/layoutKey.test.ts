import { describe, expect, it } from 'vitest';
import { buildGraphDataLayoutKey } from '../../../../src/webview/components/graph/view/layoutKey';

describe('graph/layoutKey', () => {
  it('builds an O(1) key from node size mode and structure version', () => {
    expect(buildGraphDataLayoutKey(42, 'connections')).toBe('connections::42');
  });

  it('changes only when size mode or structure version changes', () => {
    expect(buildGraphDataLayoutKey(3, 'uniform')).toBe('uniform::3');
    expect(buildGraphDataLayoutKey(4, 'uniform')).toBe('uniform::4');
  });
});
