import { beforeEach, describe, expect, it, vi } from 'vitest';

const tauri = vi.hoisted(() => ({ invoke: vi.fn(), listen: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke: tauri.invoke }));
vi.mock('@tauri-apps/api/event', () => ({ listen: tauri.listen }));

import {
  parseDesktopGraphSettings,
  listenToDesktopMenu,
  readDesktopGraphSettings,
  writeDesktopGraphSettings,
} from './bridge';

const settings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 1,
  damping: 0.4,
  centerForce: 0.1,
};

describe('desktop Graph Settings bridge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses exact shared defaults when the workspace has no desktop record', () => {
    expect(parseDesktopGraphSettings(null)).toEqual(settings);
  });

  it('clamps finite legacy values and rejects malformed interface data', () => {
    expect(parseDesktopGraphSettings({ ...settings, repelForce: 21, linkDistance: 500 }))
      .toEqual({ ...settings, repelForce: 20, linkDistance: 150 });
    expect(() => parseDesktopGraphSettings({ ...settings, linkDistance: '500' }))
      .toThrow('Core returned invalid desktop Graph Settings.');
    expect(() => parseDesktopGraphSettings({ ...settings, futureSetting: true }))
      .toThrow('Core returned invalid desktop Graph Settings.');
  });

  it('reads and writes the exact settings record through the desktop host', async () => {
    tauri.invoke.mockResolvedValue(settings);

    await expect(readDesktopGraphSettings()).resolves.toEqual(settings);
    await expect(writeDesktopGraphSettings(settings)).resolves.toEqual(settings);
    expect(tauri.invoke).toHaveBeenNthCalledWith(1, 'read_graph_settings');
    expect(tauri.invoke).toHaveBeenNthCalledWith(2, 'write_graph_settings', { settings });
  });

  it('wires Close File without taking over the native macOS window-close shortcut', async () => {
    const listeners = new Map<string, (event: { payload: unknown }) => void>();
    const unlisten = vi.fn();
    tauri.listen.mockImplementation(async (event: string, handler: (event: { payload: unknown }) => void) => {
      listeners.set(event, handler);
      return unlisten;
    });
    const handlers = {
      closeFile: vi.fn(),
      closeWorkspace: vi.fn(),
      openRecent: vi.fn(),
      openWorkspace: vi.fn(),
      recentWorkspacesChanged: vi.fn(),
      save: vi.fn(),
    };

    const stop = await listenToDesktopMenu(handlers);
    listeners.get('desktop-close-file')?.({ payload: undefined });
    listeners.get('desktop-open-recent')?.({ payload: '/workspace' });
    listeners.get('desktop-open-recent')?.({ payload: 42 });

    expect(handlers.closeFile).toHaveBeenCalledOnce();
    expect(handlers.openRecent).toHaveBeenCalledOnce();
    expect(handlers.openRecent).toHaveBeenCalledWith('/workspace');
    expect([...listeners.keys()]).toEqual([
      'desktop-open-workspace',
      'desktop-open-recent',
      'desktop-recent-workspaces-changed',
      'desktop-close-file',
      'desktop-close-workspace',
      'desktop-save',
    ]);
    stop();
    expect(unlisten).toHaveBeenCalledTimes(6);
  });
});
