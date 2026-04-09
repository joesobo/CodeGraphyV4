import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchGraphViewPrimaryRouteMessage } from '../../../../../src/extension/graphView/webview/dispatch/routed';
import { createPrimaryMessageContext } from './context';

const exportSaverMocks = vi.hoisted(() => ({
  savePng: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../../src/extension/export/savePng', () => ({
  saveExportedPng: exportSaverMocks.savePng,
}));

describe('graph view primary routed dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles node/file messages before later handlers run', async () => {
    const context = createPrimaryMessageContext();

    await expect(
      dispatchGraphViewPrimaryRouteMessage(
        { type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(context.openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(context.updateDagMode).not.toHaveBeenCalled();
  });

  it('routes export messages through the live export saver handlers', async () => {
    const context = createPrimaryMessageContext();

    await expect(
      dispatchGraphViewPrimaryRouteMessage(
        {
          type: 'EXPORT_PNG',
          payload: { dataUrl: 'data:image/png;base64,abc', filename: 'graph.png' },
        },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(exportSaverMocks.savePng).toHaveBeenCalledWith('data:image/png;base64,abc', 'graph.png');
    expect(context.updateDagMode).not.toHaveBeenCalled();
  });

  it('returns false when no routed message family handles the input', async () => {
    await expect(
      dispatchGraphViewPrimaryRouteMessage({ type: 'UPDATE_LEGENDS', payload: { legends: [] } }, createPrimaryMessageContext()),
    ).resolves.toEqual({ handled: false });
  });
});
