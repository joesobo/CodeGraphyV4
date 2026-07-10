import { describe, expect, it, vi } from 'vitest';
import { preparePerfEditorLayout } from '../../../../src/e2e/perf/run';

describe('e2e/perf/run', () => {
  it('creates the first editor group before starting the timed scenario', async () => {
    const order: string[] = [];
    const executeCommand = vi.fn(async () => {
      order.push('prepare-editor');
    });
    const now = vi.fn(() => {
      order.push('start-clock');
      return 41;
    });

    await expect(preparePerfEditorLayout({ executeCommand, now })).resolves.toBe(41);

    expect(executeCommand).toHaveBeenCalledWith('workbench.action.files.newUntitledFile');
    expect(order).toEqual(['prepare-editor', 'start-clock']);
  });
});
