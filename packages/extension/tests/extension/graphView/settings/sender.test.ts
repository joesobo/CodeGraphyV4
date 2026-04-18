import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../src/core/views/contracts';
import { sendGraphViewSettingsMessages } from '../../../../src/extension/graphView/settings/sender';

describe('graphView/settings/sender', () => {
  it('sends the ordered settings payloads without mutating the view context', () => {
    const viewContext = { activePlugins: new Set() } satisfies IViewContext;
    const sendMessage = vi.fn();

    sendGraphViewSettingsMessages(viewContext, {
      getConfiguration: () => ({
        get<T>(key: string, defaultValue: T): T {
          const values: Record<string, unknown> = {
            bidirectionalEdges: 'combined',
            showOrphans: false,
            directionMode: 'particles',
            particleSpeed: 0.02,
            particleSize: 7,
            directionColor: '#00ff00',
            showLabels: false,
          };

          return (values[key] as T | undefined) ?? defaultValue;
        },
      }),
      sendMessage,
    });

    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'SETTINGS_UPDATED',
      payload: { bidirectionalEdges: 'combined', showOrphans: false },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(3, {
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
    expect(viewContext.activePlugins.size).toBe(0);
  });
});
