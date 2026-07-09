import { describe, expect, it, vi } from 'vitest';

import { emitGraphPayloadBytes } from '../../../src/webview/perf/payload';

describe('webview/perf/payload', () => {
  it('does not serialize graph data while performance capture is disarmed', () => {
    const serialize = vi.fn();
    const bridge = {
      emit: vi.fn(),
      isArmed: () => false,
    };

    expect(emitGraphPayloadBytes({ nodes: [], edges: [] }, bridge, serialize)).toBe(false);
    expect(serialize).not.toHaveBeenCalled();
    expect(bridge.emit).not.toHaveBeenCalled();
  });

  it('emits the UTF-8 byte size of armed graph JSON', () => {
    const payload = {
      nodes: [{ id: 'é', label: 'é', color: '#ffffff' }],
      edges: [],
    };
    const bridge = {
      emit: vi.fn(() => true),
      isArmed: () => true,
    };

    expect(emitGraphPayloadBytes(payload, bridge)).toBe(true);
    expect(bridge.emit).toHaveBeenCalledWith({
      kind: 'metric',
      metric: 'payloadBytes',
      unit: 'bytes',
      value: new TextEncoder().encode(JSON.stringify(payload)).byteLength,
    });
  });

  it('keeps malformed instrumentation payloads out of the graph update path', () => {
    const bridge = {
      emit: vi.fn(),
      isArmed: () => true,
    };

    expect(emitGraphPayloadBytes(
      { nodes: [], edges: [] },
      bridge,
      () => {
        throw new TypeError('circular');
      },
    )).toBe(false);
    expect(bridge.emit).not.toHaveBeenCalled();
  });
});
