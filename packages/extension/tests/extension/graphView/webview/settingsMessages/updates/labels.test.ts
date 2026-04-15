import { describe, expect, it } from 'vitest';
import { applyShowLabelsUpdate } from '../../../../../../src/extension/graphView/webview/settingsMessages/updates/labels';
import { createHandlers } from '../testSupport';

describe('settingsMessages/updates/labels', () => {
  it('persists show-label updates and publishes them', async () => {
    const handlers = createHandlers();

    await applyShowLabelsUpdate(
      { type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } },
      handlers,
    );

    expect(handlers.updateConfig).toHaveBeenCalledWith('showLabels', false);
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
  });
});
