import { describe, expect, it, vi } from 'vitest';

import { waitForIdleCpuReady } from './coordination';

describe('idle CPU coordination', () => {
  it('polls until the extension signals the settled idle window', async () => {
    const markerExists = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const sleep = vi.fn(async () => {});

    await waitForIdleCpuReady('/tmp/idle.ready', {
      markerExists,
      now: vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(10),
      sleep,
    });

    expect(markerExists).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(50);
  });

  it('fails when the idle marker misses its deadline', async () => {
    await expect(waitForIdleCpuReady('/tmp/idle.ready', {
      markerExists: vi.fn(async () => false),
      now: vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(181_000),
      sleep: vi.fn(async () => {}),
    })).rejects.toThrow('Timed out waiting for idle CPU marker');
  });
});
