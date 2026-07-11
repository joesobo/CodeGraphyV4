import { describe, expect, it, vi } from 'vitest';

import {
  executeScopeBattery,
  type ScopeBatteryActions,
} from '../../../../../src/extension/perf/scope/battery/execution';
import type { PerfScopeEntry } from '../../../../../src/shared/perf/protocol';

describe('extension/perf/scope/battery/execution', () => {
  it('separates preconditioning and measured toggles with quiet windows', async () => {
    const original: PerfScopeEntry = {
      scopeKind: 'node',
      scopeId: 'file',
      enabled: true,
    };
    let current = original;
    const events: Array<{ enabled: boolean; measured: boolean } | 'quiet'> = [];
    const actions: ScopeBatteryActions = {
      operationId: 'scope-operation',
      requestInventory: vi.fn(async () => [{ ...current }]),
      toggle: vi.fn(async (entry, measured) => {
        current = entry;
        events.push({ enabled: entry.enabled, measured });
      }),
      waitForQuietWindow: vi.fn(async () => { events.push('quiet'); }),
    };

    await expect(executeScopeBattery(actions)).resolves.toEqual([original]);

    expect(events).toEqual([
      { enabled: false, measured: false },
      { enabled: true, measured: false },
      'quiet',
      ...Array.from({ length: 5 }, () => [
        { enabled: false, measured: true },
        'quiet' as const,
        { enabled: true, measured: true },
        'quiet' as const,
      ]).flat(),
    ]);
    expect(current).toEqual(original);
  });
});
