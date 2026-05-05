import { describe, expect, it } from 'vitest';
import { isZoomKey } from '../../../../src/webview/components/graphCornerControls/zoom/keyboard';

describe('graphCornerControls/zoom/keyboard', () => {
  it('recognizes Enter and Space as zoom activation keys', () => {
    expect(isZoomKey('Enter')).toBe(true);
    expect(isZoomKey(' ')).toBe(true);
  });

  it('rejects other keys', () => {
    expect(isZoomKey('Escape')).toBe(false);
    expect(isZoomKey('Spacebar')).toBe(false);
  });
});
