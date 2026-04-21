import { describe, expect, it, vi } from 'vitest';
import { applyGraphControlMessage } from '../../../../../../src/extension/graphView/webview/settingsMessages/updates/controls';
import { createHandlers } from '../testSupport';

describe('settingsMessages/updates/controls', () => {
  it('updates graph control config maps and publishes refreshed controls', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(_: string, defaultValue: T): T => (
        ({ ...defaultValue, file: true } as T)
      )),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'package', visible: false } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', {
      file: true,
      package: false,
    });
    expect(handlers.sendGraphControls).toHaveBeenCalledOnce();
  });

  it('recomputes and republishes legends when node visibility changes', async () => {
    const handlers = createHandlers();

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'folder', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.recomputeGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('updates each graph control message type with the matching config key', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(_: string, defaultValue: T): T => defaultValue),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_EDGE_VISIBILITY', payload: { edgeKind: 'import', visible: false } },
        handlers,
      ),
    ).resolves.toBe(true);
    await expect(
      applyGraphControlMessage(
        {
          type: 'UPDATE_NODE_COLOR',
          payload: { nodeType: 'file', color: '#123456', enabled: false },
        },
        handlers,
      ),
    ).resolves.toBe(true);
    expect(handlers.updateConfig).toHaveBeenNthCalledWith(1, 'edgeVisibility', { import: false });
    expect(handlers.updateConfig).toHaveBeenNthCalledWith(2, 'nodeColors', { file: '#123456' });
    expect(handlers.updateConfig).toHaveBeenNthCalledWith(3, 'nodeColorEnabled', { file: false });
    expect(handlers.sendGraphControls).toHaveBeenCalledTimes(2);
  });

  it('returns false for unrelated messages without updating settings', async () => {
    const handlers = createHandlers();

    await expect(
      applyGraphControlMessage(
        { type: 'WEBVIEW_READY' } as never,
        handlers,
      ),
    ).resolves.toBe(false);

    expect(handlers.updateConfig).not.toHaveBeenCalled();
    expect(handlers.sendGraphControls).not.toHaveBeenCalled();
  });
});
