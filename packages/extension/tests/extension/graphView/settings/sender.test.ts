import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../src/core/views/contracts';
import { sendGraphViewSettingsMessages } from '../../../../src/extension/graphView/settings/sender';

describe('graphView/settings/sender', () => {
  it('updates folder node color and sends the ordered settings payloads', () => {
    const viewContext = { activePlugins: new Set(), folderNodeColor: '#000000' } satisfies IViewContext;
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
            folderNodeColor: '#112233',
            showLabels: false,
          };

          return (values[key] as T | undefined) ?? defaultValue;
        },
      }),
      sendMessage,
    });

    expect(viewContext.folderNodeColor).toBe('#112233');
    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'SETTINGS_UPDATED',
      payload: { bidirectionalEdges: 'combined', showOrphans: false },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(4, {
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
  });
});
