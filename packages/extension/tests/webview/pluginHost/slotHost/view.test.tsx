import React from 'react';
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
});
