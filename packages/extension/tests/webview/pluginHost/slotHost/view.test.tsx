import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlotHost } from '../../../../src/webview/pluginHost/slotHost/view';
import type { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';

function createPluginHost() {
  return {
    attachSlotHost: vi.fn(),
    detachSlotHost: vi.fn(),
  } as unknown as WebviewPluginHost;
}

describe('SlotHost', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches the host element on mount and detaches it on unmount', () => {
    const pluginHost = createPluginHost();

    const { unmount } = render(
      <SlotHost
        pluginHost={pluginHost}
        slot="toolbar"
        data-testid="slot-host"
      />,
    );

    expect(pluginHost.attachSlotHost).toHaveBeenCalledWith(
      'toolbar',
      expect.any(HTMLDivElement),
    );

    unmount();

    expect(pluginHost.detachSlotHost).toHaveBeenCalledWith('toolbar');
  });

  it('reattaches the host when the slot changes', () => {
    const pluginHost = createPluginHost();

    const { rerender, unmount } = render(
      <SlotHost
        pluginHost={pluginHost}
        slot="toolbar"
        data-testid="slot-host"
      />,
    );

    rerender(
      <SlotHost
        pluginHost={pluginHost}
        slot="timeline-panel"
        data-testid="slot-host"
      />,
    );

    expect(pluginHost.attachSlotHost).toHaveBeenNthCalledWith(
      1,
      'toolbar',
      expect.any(HTMLDivElement),
    );
    expect(pluginHost.detachSlotHost).toHaveBeenCalledWith('toolbar');
    expect(pluginHost.attachSlotHost).toHaveBeenNthCalledWith(
      2,
      'timeline-panel',
      expect.any(HTMLDivElement),
    );

    unmount();
    expect(pluginHost.detachSlotHost).toHaveBeenCalledWith('timeline-panel');
  });
});
