import { describe, expect, it, vi } from 'vitest';
import { publishCurrentGraphAccessibilityItems } from '../../../../../src/webview/components/graph/viewport/shell/accessibilityItems';

describe('publishCurrentGraphAccessibilityItems', () => {
  it('republishes screen-space node bounds when zoom changes', () => {
    let zoom = 1;
    const setAccessibilityItems = vi.fn();
    const accessibilityDirtyRef = { current: true };
    const lastAccessibilitySignatureRef = { current: '' };
    const node = {
      id: 'src/index.ts',
      label: 'index.ts',
      color: '#fff',
      size: 8,
      x: 10,
      y: 20,
    } as never;
    const publish = () => publishCurrentGraphAccessibilityItems({
      accessibilityDirtyRef,
      graph: {
        graph2ScreenCoords: (x, y) => ({ x, y }),
        zoom: () => zoom,
      },
      lastAccessibilitySignatureRef,
      links: [],
      nodes: [node],
      setAccessibilityItems,
    });

    publish();
    zoom = 4;
    accessibilityDirtyRef.current = true;
    publish();

    expect(setAccessibilityItems).toHaveBeenCalledTimes(2);
    expect(setAccessibilityItems.mock.calls[0][0].nodes[0].radius).toBe(8);
    expect(setAccessibilityItems.mock.calls[1][0].nodes[0].radius).toBe(16);
  });
});
