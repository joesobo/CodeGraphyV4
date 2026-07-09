import { describe, expect, it, vi } from 'vitest';

import type {
  PerfEventInput,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../src/shared/perf/protocol';
import { createScopePerfTarget } from '../../../../src/webview/perf/scope/target';

const operation: PerfOperation = {
  dimension: 'large',
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'scope-toggle',
};

const fileEntry: PerfScopeEntry = {
  scopeKind: 'node',
  scopeId: 'file',
  enabled: false,
};

function setup() {
  let frameCallback: FrameRequestCallback | undefined;
  let postedCallback: (() => void) | undefined;
  const emitFor = vi.fn((_operation: PerfOperation, _event: PerfEventInput) => true);
  const applyVisibility = vi.fn((_entry: PerfScopeEntry, onPosted?: () => void) => {
    postedCallback = onPosted;
    return true;
  });
  const getInventory = vi.fn(() => [fileEntry]);
  const target = createScopePerfTarget({
    applyVisibility,
    bridge: { emitFor },
    cancelFrame: vi.fn(),
    getInventory,
    requestFrame: vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 7;
    }),
  });
  return {
    applyVisibility,
    emitFor,
    frame: () => frameCallback?.(26),
    posted: () => postedCallback?.(),
    target,
  };
}

describe('webview/perf/scope/target', () => {
  it('emits the actual current scope inventory', () => {
    const { emitFor, target } = setup();

    target.requestInventory(operation);

    expect(emitFor).toHaveBeenCalledWith(operation, {
      kind: 'scope-inventory',
      entries: [fileEntry],
    });
  });

  it('emits row-specific toggle completion after the next frame', () => {
    const { emitFor, frame, target } = setup();

    expect(target.toggle(operation, fileEntry)).toBe(true);
    frame();

    expect(emitFor).not.toHaveBeenCalledWith(operation, expect.objectContaining({
      kind: 'metric',
    }));
    expect(emitFor).toHaveBeenCalledWith(operation, {
      kind: 'scope-toggle-complete',
      ...fileEntry,
    });
  });

  it('emits persistence completion only after posting and receiving the matching host echo', () => {
    const { emitFor, frame, posted, target } = setup();
    target.toggle(operation, fileEntry);
    frame();

    target.graphControlsUpdated({
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#fff', defaultVisible: true }],
      edgeTypes: [],
      nodeColors: {},
      nodeVisibility: { file: false },
      edgeVisibility: {},
    });
    expect(emitFor).not.toHaveBeenCalledWith(operation, expect.objectContaining({
      kind: 'scope-persist-complete',
    }));

    posted();
    target.graphControlsUpdated({
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#fff', defaultVisible: true }],
      edgeTypes: [],
      nodeColors: {},
      nodeVisibility: { file: false },
      edgeVisibility: {},
    });

    expect(emitFor).toHaveBeenCalledWith(operation, {
      kind: 'scope-persist-complete',
      ...fileEntry,
    });
  });

  it('ignores a host echo with the wrong persisted value', () => {
    const { emitFor, frame, posted, target } = setup();
    target.toggle(operation, fileEntry);
    frame();
    posted();

    target.graphControlsUpdated({
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#fff', defaultVisible: true }],
      edgeTypes: [],
      nodeColors: {},
      nodeVisibility: { file: true },
      edgeVisibility: {},
    });

    expect(emitFor).not.toHaveBeenCalledWith(operation, expect.objectContaining({
      kind: 'scope-persist-complete',
    }));
  });

  it('rejects overlapping toggles and unavailable rows', () => {
    const { applyVisibility, target } = setup();

    expect(target.toggle(operation, fileEntry)).toBe(true);
    expect(target.toggle(operation, { ...fileEntry, enabled: true })).toBe(false);
    vi.mocked(applyVisibility).mockReturnValueOnce(false);
    target.cancel();
    expect(target.toggle(operation, fileEntry)).toBe(false);
  });
});
