import { describe, expect, it, vi } from 'vitest';
import { CodeGraphyAPIImpl } from '@/core/plugins/api/instance';
import { registerPluginToolbarAction } from '@/core/plugins/api/instance/runtime/registration';
import { EventBus } from '@/core/plugins/events/bus';
import { DecorationManager } from '@/core/plugins/decoration/manager';
import { ViewRegistry } from '@/core/views/registry';
import type { IGraphData } from '@/shared/graph/contracts';
import type { IViewContext } from '@/core/views/contracts';
import { createTestAPI } from './testSupport';

describe('CodeGraphyAPIImpl registration', () => {
  it('registers views with the registry and tags plugin IDs', () => {
    const { api, viewRegistry } = createTestAPI('my-plugin');
    const view = {
      id: 'test-view',
      name: 'Test View',
      icon: 'symbol-file',
      description: 'A test view',
      transform: (data: IGraphData, _context: IViewContext) => data,
    };

    const disposable = api.registerView(view);

    expect(viewRegistry.get('test-view')).toBeDefined();
    expect(viewRegistry.get('test-view')?.view.pluginId).toBe('my-plugin');

    disposable.dispose();
    expect(viewRegistry.get('test-view')).toBeUndefined();
  });

  it('registers commands and disposes them cleanly', () => {
    const { api, commandRegistrar } = createTestAPI();
    const action = vi.fn();

    const disposable = api.registerCommand({ id: 'test.command', title: 'Test Command', action });

    expect(commandRegistrar).toHaveBeenCalledWith('test.command', action);
    expect(api.commands).toHaveLength(1);

    disposable.dispose();
    expect(api.commands).toHaveLength(0);
  });

  it('disposes the command registrar disposable when command disposes', () => {
    const innerDispose = vi.fn();
    const commandRegistrar = vi.fn(() => ({ dispose: innerDispose }));
    const api = new CodeGraphyAPIImpl(
      'test',
      new EventBus(),
      new DecorationManager(),
      new ViewRegistry(),
      () => ({ nodes: [], edges: [] }),
      commandRegistrar,
      vi.fn(),
      vi.fn(async () => undefined),
      '/workspace',
      vi.fn(),
    );

    const disposable = api.registerCommand({
      id: 'cmd',
      title: 'Cmd',
      action: vi.fn(),
    });
    disposable.dispose();

    expect(innerDispose).toHaveBeenCalled();
  });

  it('does not remove other commands when a command disposable is disposed twice', () => {
    const { api } = createTestAPI();

    const firstDisposable = api.registerCommand({
      id: 'cmd.one',
      title: 'Cmd One',
      action: vi.fn(),
    });
    api.registerCommand({
      id: 'cmd.two',
      title: 'Cmd Two',
      action: vi.fn(),
    });

    firstDisposable.dispose();
    firstDisposable.dispose();

    expect(api.commands).toHaveLength(1);
    expect(api.commands[0]?.id).toBe('cmd.two');
  });

  it('registers and removes context menu items', () => {
    const { api } = createTestAPI();
    const item = {
      label: 'Test Item',
      when: 'node' as const,
      action: vi.fn(),
    };

    const disposable = api.registerContextMenuItem(item);
    expect(api.contextMenuItems).toHaveLength(1);
    expect(api.contextMenuItems[0]).toBe(item);

    disposable.dispose();
    expect(api.contextMenuItems).toHaveLength(0);
  });

  it('registers and removes exporters', () => {
    const { api } = createTestAPI();
    const exporter = {
      id: 'test.exporter',
      label: 'Test Exporter',
      run: vi.fn(),
    };

    const disposable = api.registerExporter(exporter);
    expect(api.exporters).toHaveLength(1);
    expect(api.exporters[0]).toBe(exporter);

    disposable.dispose();
    expect(api.exporters).toHaveLength(0);
  });

  it('registers and removes toolbar actions', () => {
    const { api } = createTestAPI();
    const action = {
      id: 'test.toolbar',
      label: 'Toolbar Action',
      items: [{ id: 'test.toolbar.item', label: 'Toolbar Action Item', run: vi.fn() }],
    };

    const disposable = api.registerToolbarAction(action);
    expect(api.toolbarActions).toHaveLength(1);
    expect(api.toolbarActions[0]).toBe(action);

    disposable.dispose();
    expect(api.toolbarActions).toHaveLength(0);
  });

  it('does not remove other context menu items when a disposable is disposed twice', () => {
    const { api } = createTestAPI();

    const firstDisposable = api.registerContextMenuItem({
      label: 'First Item',
      when: 'node',
      action: vi.fn(),
    });
    api.registerContextMenuItem({
      label: 'Second Item',
      when: 'edge',
      action: vi.fn(),
    });

    firstDisposable.dispose();
    firstDisposable.dispose();

    expect(api.contextMenuItems).toHaveLength(1);
    expect(api.contextMenuItems[0]?.label).toBe('Second Item');
  });

  it('delegates plugin export saves through the host saver', async () => {
    const { api, exportSaver } = createTestAPI();

    await api.saveExport({
      filename: 'graph.json',
      content: '{"graph":true}',
    });

    expect(exportSaver).toHaveBeenCalledWith({
      filename: 'graph.json',
      content: '{"graph":true}',
    });
  });

  it('leaves the remaining toolbar actions untouched when the removed action is already missing', () => {
    const otherAction = {
      id: 'other.toolbar',
      label: 'Other Toolbar Action',
      items: [{ id: 'other.toolbar.item', label: 'Other Toolbar Action Item', run: vi.fn() }],
    };
    const action = {
      id: 'missing.toolbar',
      label: 'Missing Toolbar Action',
      items: [{ id: 'missing.toolbar.item', label: 'Missing Toolbar Action Item', run: vi.fn() }],
    };
    const context = {
      pluginId: 'test-plugin',
      viewRegistry: new ViewRegistry(),
      commandRegistrar: vi.fn(),
      commands: [],
      contextMenuItems: [],
      exporters: [],
      toolbarActions: [otherAction],
    } as unknown as Parameters<typeof registerPluginToolbarAction>[0];

    const disposable = registerPluginToolbarAction(context, action);
    context.toolbarActions.pop();
    disposable.dispose();

    expect(context.toolbarActions).toEqual([otherAction]);
  });
});
