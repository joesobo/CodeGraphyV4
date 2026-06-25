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

  it('applies batched visibility updates with one publish cycle', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return { symbol: false, 'symbol:function': false, folder: true } as T;
        }
        if (key === 'edgeVisibility') {
          return { include: false } as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applyGraphControlMessage(
        {
          type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
          payload: {
            nodeVisibility: {
              'symbol:function': true,
              folder: false,
            },
            edgeVisibility: {
              include: true,
            },
          },
        },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenNthCalledWith(1, 'nodeVisibility', {
      symbol: true,
      'symbol:function': true,
      folder: false,
    });
    expect(handlers.updateConfig).toHaveBeenNthCalledWith(2, 'edgeVisibility', {
      include: true,
    });
    expect(handlers.recomputeGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(handlers.sendGraphControls).toHaveBeenCalledOnce();
    expect(handlers.reprocessGraphScope).toHaveBeenCalledOnce();
  });

  it('keeps node and edge visibility bursts projection-only with zero graph jobs', async () => {
    const config = {
      nodeVisibility: {} as Record<string, boolean | string>,
      edgeVisibility: {} as Record<string, boolean | string>,
      nodeColors: {} as Record<string, boolean | string>,
    };
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => (
        key in config ? { ...config[key as keyof typeof config] } as T : defaultValue
      )),
      updateConfig: vi.fn(async (key: string, value: unknown) => {
        if (key in config && value && typeof value === 'object' && !Array.isArray(value)) {
          config[key as keyof typeof config] = value as Record<string, boolean | string>;
        }
      }),
    });

    const messages = [
      { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'file', visible: false } },
      { type: 'UPDATE_EDGE_VISIBILITY', payload: { edgeKind: 'import', visible: false } },
      { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'folder', visible: true } },
      { type: 'UPDATE_EDGE_VISIBILITY', payload: { edgeKind: 'reference', visible: true } },
      { type: 'UPDATE_NODE_COLOR', payload: { nodeType: 'file', color: '#123456' } },
      { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'package', visible: false } },
      { type: 'UPDATE_EDGE_VISIBILITY', payload: { edgeKind: 'nests', visible: true } },
      { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'external-package', visible: true } },
      { type: 'UPDATE_EDGE_VISIBILITY', payload: { edgeKind: 'exports', visible: false } },
      {
        type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
        payload: {
          nodeVisibility: { file: true },
          edgeVisibility: { import: true },
        },
      },
    ] as const;

    for (const message of messages) {
      await expect(applyGraphControlMessage(message, handlers)).resolves.toBe(true);
    }

    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
    expect(handlers.hydrateGraphScope).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('ignores empty batched visibility updates', async () => {
    const handlers = createHandlers();

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH', payload: {} },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).not.toHaveBeenCalled();
    expect(handlers.sendGroupsUpdated).not.toHaveBeenCalled();
    expect(handlers.sendGraphControls).not.toHaveBeenCalled();
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
      'symbol:method': '#A855F7',
      'symbol:namespace': '#64748B',
    });
    expect(handlers.updateConfig).not.toHaveBeenCalledWith('nodeColors', expect.objectContaining({
      'symbol:variable': expect.any(String),
    }));
  });

  it('enables Symbols without changing edge visibility or reprocessing analysis', async () => {
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
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
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

  it('hydrates cached graph scope instead of reprocessing when a symbol child type is enabled from cache', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return { symbol: false, 'symbol:function': false } as T;
        }
        return defaultValue;
      }),
      hydrateGraphScope: vi.fn(() => Promise.resolve(true)),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol:function', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.hydrateGraphScope).toHaveBeenCalledOnce();
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('keeps hydrated symbol evidence in memory for later off/on toggles', async () => {
    let nodeVisibility: Record<string, boolean> = {
      symbol: false,
      'symbol:function': false,
    };
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => (
        key === 'nodeVisibility' ? { ...nodeVisibility } as T : defaultValue
      )),
      updateConfig: vi.fn(async (key: string, value: unknown) => {
        if (key === 'nodeVisibility') {
          nodeVisibility = value as Record<string, boolean>;
        }
      }),
      hydrateGraphScope: vi.fn(() => Promise.resolve(true)),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol:function', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);
    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol:function', visible: false } },
        handlers,
      ),
    ).resolves.toBe(true);
    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol:function', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.hydrateGraphScope).toHaveBeenCalledTimes(2);
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
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

  it('enables Symbols and Variables when a variable child type is enabled', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return { symbol: false, variable: false, 'symbol:global': false } as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol:global', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', {
      symbol: true,
      variable: true,
      'symbol:global': true,
    });
    expect(handlers.reprocessGraphScope).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('enables Symbols when the variable parent type is enabled without reprocessing analysis', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return { symbol: false, variable: false } as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'variable', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', {
      symbol: true,
      variable: true,
    });
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('does not reprocess analysis when enabled symbol facts are already active', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'nodeVisibility') {
          return { symbol: true, 'symbol:function': true, 'symbol:prototype': false } as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applyGraphControlMessage(
        { type: 'UPDATE_NODE_VISIBILITY', payload: { nodeType: 'symbol:prototype', visible: true } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('nodeVisibility', {
      symbol: true,
      'symbol:function': true,
      'symbol:prototype': true,
    });
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
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
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
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
