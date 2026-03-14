import { describe, expect, it, vi } from 'vitest';
import {
  applyPluginContextMenuAction,
  applyPluginGroupToggle,
  applyPluginInteraction,
  applyPluginSectionToggle,
} from '../../../../src/extension/graphView/messages/plugin';

function createGroupHandlers(hiddenPluginGroupIds = new Set<string>()) {
  return {
    hiddenPluginGroupIds,
    updateHiddenPluginGroups: vi.fn(() => Promise.resolve()),
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
  };
}

describe('graph view plugin messages', () => {
  it('routes plugin graph interactions to the plugin api', () => {
    const deliverWebviewMessage = vi.fn();

    applyPluginInteraction(
      { event: 'plugin:test.plugin:ping', data: { ok: true } },
      {
        getPluginApi: () => ({ deliverWebviewMessage }),
        emitEvent: vi.fn(),
      }
    );

    expect(deliverWebviewMessage).toHaveBeenCalledWith({
      type: 'ping',
      data: { ok: true },
    });
  });

  it('emits non-plugin graph interactions on the event bus', () => {
    const emitEvent = vi.fn();

    applyPluginInteraction(
      { event: 'graph:nodeClick', data: { nodeId: 'src/app.ts' } },
      {
        getPluginApi: vi.fn(),
        emitEvent,
      }
    );

    expect(emitEvent).toHaveBeenCalledWith('graph:nodeClick', { nodeId: 'src/app.ts' });
  });

  it('ignores malformed plugin graph interactions', () => {
    const emitEvent = vi.fn();
    const getPluginApi = vi.fn();

    applyPluginInteraction(
      { event: 'plugin:test.plugin', data: { ok: true } },
      {
        getPluginApi,
        emitEvent,
      }
    );

    expect(getPluginApi).not.toHaveBeenCalled();
    expect(emitEvent).not.toHaveBeenCalled();
  });

  it('runs plugin context menu actions for node targets', async () => {
    const action = vi.fn(() => Promise.resolve());
    const node = { id: 'src/app.ts' };

    await applyPluginContextMenuAction(
      {
        pluginId: 'test.plugin',
        index: 0,
        targetId: 'src/app.ts',
        targetType: 'node',
      },
      {
        getPluginApi: () => ({ contextMenuItems: [{ action }] }),
        findNode: () => node,
        findEdge: vi.fn(),
        logError: vi.fn(),
      }
    );

    expect(action).toHaveBeenCalledWith(node);
  });

  it('logs plugin context menu action failures', async () => {
    const error = new Error('boom');
    const logError = vi.fn();

    await applyPluginContextMenuAction(
      {
        pluginId: 'test.plugin',
        index: 0,
        targetId: 'src/app.ts',
        targetType: 'node',
      },
      {
        getPluginApi: () => ({
          contextMenuItems: [{ action: vi.fn(() => Promise.reject(error)) }],
        }),
        findNode: () => ({ id: 'src/app.ts' }),
        findEdge: vi.fn(),
        logError,
      }
    );

    expect(logError).toHaveBeenCalledWith('[CodeGraphy] Plugin context menu action error:', error);
  });

  it('ignores plugin context menu actions with missing targets', async () => {
    const action = vi.fn();

    await applyPluginContextMenuAction(
      {
        pluginId: 'test.plugin',
        index: 0,
        targetId: 'missing.ts',
        targetType: 'node',
      },
      {
        getPluginApi: () => ({ contextMenuItems: [{ action }] }),
        findNode: () => undefined,
        findEdge: vi.fn(),
        logError: vi.fn(),
      }
    );

    expect(action).not.toHaveBeenCalled();
  });

  it('adds a disabled plugin group and refreshes merged groups', async () => {
    const handlers = createGroupHandlers();

    await applyPluginGroupToggle({ groupId: 'plugin:test:*.ts', disabled: true }, handlers);

    expect(handlers.hiddenPluginGroupIds.has('plugin:test:*.ts')).toBe(true);
    expect(handlers.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:test:*.ts']);
    expect(handlers.recomputeGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('removes a re-enabled plugin group', async () => {
    const handlers = createGroupHandlers(new Set(['plugin:test:*.ts']));

    await applyPluginGroupToggle({ groupId: 'plugin:test:*.ts', disabled: false }, handlers);

    expect(handlers.hiddenPluginGroupIds.has('plugin:test:*.ts')).toBe(false);
    expect(handlers.updateHiddenPluginGroups).toHaveBeenCalledWith([]);
  });

  it('stores section-level keys when disabling a plugin section', async () => {
    const handlers = createGroupHandlers();

    await applyPluginSectionToggle(
      { pluginId: 'codegraphy.typescript', disabled: true },
      handlers
    );

    expect(handlers.hiddenPluginGroupIds.has('plugin:codegraphy.typescript')).toBe(true);
    expect(handlers.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:codegraphy.typescript']);
  });

  it('clears section keys and child group entries when re-enabling a plugin section', async () => {
    const handlers = createGroupHandlers(
      new Set([
        'plugin:codegraphy.typescript',
        'plugin:codegraphy.typescript:*.ts',
        'plugin:codegraphy.python:*.py',
      ])
    );

    await applyPluginSectionToggle(
      { pluginId: 'codegraphy.typescript', disabled: false },
      handlers
    );

    expect(handlers.hiddenPluginGroupIds.has('plugin:codegraphy.typescript')).toBe(false);
    expect(handlers.hiddenPluginGroupIds.has('plugin:codegraphy.typescript:*.ts')).toBe(false);
    expect(handlers.hiddenPluginGroupIds.has('plugin:codegraphy.python:*.py')).toBe(true);
    expect(handlers.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:codegraphy.python:*.py']);
  });
});
