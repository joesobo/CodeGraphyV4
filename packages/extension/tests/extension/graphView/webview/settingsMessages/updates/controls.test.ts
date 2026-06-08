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
          payload: { nodeType: 'file', color: '#123456' },
        },
        handlers,
      ),
    ).resolves.toBe(true);
    expect(handlers.updateConfig).toHaveBeenNthCalledWith(1, 'edgeVisibility', { import: false });
    expect(handlers.updateConfig).toHaveBeenNthCalledWith(2, 'nodeColors', { file: '#123456' });
    expect(handlers.sendGraphControls).toHaveBeenCalledTimes(2);
  });

  it('prunes stale symbol control keys when graph control settings are written', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return {
            symbol: true,
            'symbol:function': true,
            'symbol:method': true,
            'symbol:namespace': true,
            'symbol:variable': true,
          } as T;
        }
        if (key === 'nodeColors') {
          return {
            symbol: '#8B5CF6',
            'symbol:function': '#8B5CF6',
            'symbol:method': '#A855F7',
            'symbol:namespace': '#64748B',
            'symbol:variable': '#14B8A6',
          } as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_COLOR', payload: { nodeType: 'symbol:function', color: '#123456' } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeColors', {
      symbol: '#8B5CF6',
      'symbol:function': '#123456',
    });
    expect(handlers.updateConfig).not.toHaveBeenCalledWith('nodeColors', expect.objectContaining({
      'symbol:method': expect.any(String),
      'symbol:namespace': expect.any(String),
      'symbol:variable': expect.any(String),
    }));
  });

  it('enables Symbols without changing edge visibility', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return { symbol: false } as T;
        }
        if (key === 'edgeVisibility') {
          return { contains: false } as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledOnce();
    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', { symbol: true });
    expect(handlers.updateConfig).not.toHaveBeenCalledWith('edgeVisibility', expect.anything());
    expect(handlers.reprocessGraphScope).toHaveBeenCalledOnce();
    expect(handlers.sendGraphControls).toHaveBeenCalledOnce();
  });

  it('enables Symbols and reprocesses scope without changing edge visibility when a symbol child type is enabled', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return { symbol: false, 'symbol:function': false } as T;
        }
        if (key === 'edgeVisibility') {
          return { contains: false } as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol:function', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledOnce();
    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', {
      symbol: true,
      'symbol:function': true,
    });
    expect(handlers.updateConfig).not.toHaveBeenCalledWith('edgeVisibility', expect.anything());
    expect(handlers.reprocessGraphScope).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('enables Symbols and Variables when a variable child type is enabled', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return { symbol: false, variable: false, 'symbol:constant': false } as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol:constant', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', {
      symbol: true,
      variable: true,
      'symbol:constant': true,
    });
    expect(handlers.reprocessGraphScope).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('preserves child visibility settings when Symbols is disabled', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => (
        key === 'nodeVisibility'
          ? { symbol: true, variable: true, 'symbol:function': true } as T
          : defaultValue
      )),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol', visible: false } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', {
      symbol: false,
      variable: true,
      'symbol:function': true,
    });
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).toHaveBeenCalledWith('symbol');
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
