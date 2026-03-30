import { describe, expect, it, vi } from 'vitest';
import { CodeGraphyAPIImpl } from '@/core/plugins/codeGraphyApi';
import { EventBus } from '@/core/plugins/eventBus';
import { DecorationManager } from '@/core/plugins/decoration/manager';
import { ViewRegistry } from '@/core/views/registry';
import type { IGraphData } from '@/shared/graph/types';
import type { IViewContext } from '@/core/views/contracts';
import { createTestAPI } from './codeGraphyApi.test-utils';

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
});
