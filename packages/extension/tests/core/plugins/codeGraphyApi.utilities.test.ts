import { describe, expect, it, vi } from 'vitest';
import { createTestAPI } from './codeGraphyApi.test-utils';

describe('CodeGraphyAPIImpl utilities', () => {
  it('returns the workspace root', () => {
    const { api } = createTestAPI();
    expect(api.getWorkspaceRoot()).toBe('/workspace');
  });

  it('logs with the plugin prefix', () => {
    const { api, logFn } = createTestAPI('my-plugin');

    api.log('info', 'hello', 'world');

    expect(logFn).toHaveBeenCalledWith('info', '[my-plugin]', 'hello', 'world');
  });

  it('supports multiple log levels', () => {
    const { api, logFn } = createTestAPI();

    api.log('warn', 'warning message');
    api.log('error', 'error message');

    expect(logFn).toHaveBeenCalledTimes(2);
    expect(logFn).toHaveBeenCalledWith('warn', '[test-plugin]', 'warning message');
    expect(logFn).toHaveBeenCalledWith('error', '[test-plugin]', 'error message');
  });

  it('returns the plugin ID', () => {
    const { api } = createTestAPI('my-plugin');
    expect(api.pluginId).toBe('my-plugin');
  });

  it('returns the live registered collections', () => {
    const { api } = createTestAPI();
    const command = { id: 'cmd', title: 'Command', action: vi.fn() };
    const contextMenuItem = { label: 'Item', when: 'node' as const, action: vi.fn() };
    const exporter = { id: 'exporter', label: 'Exporter', run: vi.fn() };
    const toolbarAction = {
      id: 'toolbar',
      label: 'Toolbar',
      items: [{ id: 'toolbar.item', label: 'Toolbar Item', run: vi.fn() }],
    };

    api.registerCommand(command);
    api.registerContextMenuItem(contextMenuItem);
    api.registerExporter(exporter);
    api.registerToolbarAction(toolbarAction);

    expect(api.commands).toEqual([command]);
    expect(api.contextMenuItems).toEqual([contextMenuItem]);
    expect(api.exporters).toEqual([exporter]);
    expect(api.toolbarActions).toEqual([toolbarAction]);
  });
});
