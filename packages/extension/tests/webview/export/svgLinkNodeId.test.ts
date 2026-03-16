import { describe, expect, it } from 'vitest';
import { getLinkNodeId } from '../../../src/webview/export/svgLinkNodeId';

describe('exportSvgLinkNodeId', () => {
  it('returns null when the node reference is missing', () => {
    expect(getLinkNodeId(undefined)).toBeNull();
  });

  it('normalizes primitive node identifiers to strings', () => {
    expect(getLinkNodeId('alpha')).toBe('alpha');
    expect(getLinkNodeId(42)).toBe('42');
  });

  it('normalizes object node identifiers and rejects objects without ids', () => {
    expect(getLinkNodeId({ id: 'beta' })).toBe('beta');
    expect(getLinkNodeId({ id: 7 })).toBe('7');
    expect(getLinkNodeId({})).toBeNull();
  });
});
