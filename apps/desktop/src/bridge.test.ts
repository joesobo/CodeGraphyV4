import { beforeEach, describe, expect, it, vi } from 'vitest';

const tauri = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke: tauri.invoke }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

import {
  parseDesktopGraphSettings,
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

  it('rejects malformed or out-of-range interface data', () => {
    expect(() => parseDesktopGraphSettings({ ...settings, repelForce: 21 }))
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
});
