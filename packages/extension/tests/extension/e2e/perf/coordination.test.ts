import { describe, expect, it, vi } from 'vitest';

import { waitForIdleCpuDone } from '../../../../src/e2e/perf/coordination';

describe('e2e/perf idle CPU coordination', () => {
  it('keeps the E2E process alive until the parent completes sampling', async () => {
    const markerExists = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const sleep = vi.fn(async () => {});

    await waitForIdleCpuDone('/tmp/idle.done', {
      markerExists,
      now: vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(10),
      sleep,
    });

    expect(markerExists).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(50);
  });

  it('fails within a bounded timeout when the parent never completes', async () => {
    await expect(waitForIdleCpuDone('/tmp/idle.done', {
      markerExists: vi.fn(async () => false),
      now: vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(30_000),
      sleep: vi.fn(async () => {}),
    })).rejects.toThrow('Timed out waiting for idle CPU completion marker');
  });
});
