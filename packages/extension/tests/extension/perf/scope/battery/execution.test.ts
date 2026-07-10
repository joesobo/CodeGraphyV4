import { describe, expect, it, vi } from 'vitest';

import {
  executeScopeBattery,
  type ScopeBatteryActions,
} from '../../../../../src/extension/perf/scope/battery/execution';
import type { PerfScopeEntry } from '../../../../../src/shared/perf/protocol';

describe('extension/perf/scope/battery/execution', () => {
  it('preconditions once before exactly three measured away-and-back toggles', async () => {
    const original: PerfScopeEntry = {
      scopeKind: 'node',
      scopeId: 'file',
      enabled: true,
    };
    let current = original;
    const toggles: Array<{ enabled: boolean; measured: boolean }> = [];
    const actions: ScopeBatteryActions = {
      operationId: 'scope-operation',
      requestInventory: vi.fn(async () => [{ ...current }]),
      toggle: vi.fn(async (entry, measured) => {
        current = entry;
        toggles.push({ enabled: entry.enabled, measured });
      }),
    };

    await expect(executeScopeBattery(actions)).resolves.toEqual([original]);

    expect(toggles).toEqual([
      { enabled: false, measured: false },
      { enabled: true, measured: false },
      { enabled: false, measured: true },
      { enabled: true, measured: true },
      { enabled: false, measured: true },
      { enabled: true, measured: true },
      { enabled: false, measured: true },
      { enabled: true, measured: true },
    ]);
    expect(current).toEqual(original);
  });
});
