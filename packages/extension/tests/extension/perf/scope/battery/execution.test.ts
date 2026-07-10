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
      { enabled: false, measured: true },
      'quiet',
      { enabled: true, measured: true },
      'quiet',
      { enabled: false, measured: true },
      'quiet',
      { enabled: true, measured: true },
      'quiet',
      { enabled: false, measured: true },
      'quiet',
      { enabled: true, measured: true },
      'quiet',
    ]);
    expect(current).toEqual(original);
  });
});
