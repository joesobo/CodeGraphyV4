import { describe, expect, it, vi } from 'vitest';
import { createGraphStageEscapeBridge } from '../../../../../src/webview/app/shell/escape/graphStage';

describe('app/shell Graph Stage Escape bridge', () => {
  it('routes coordinator effects to the attached Graph Stage and detaches safely', () => {
    const bridge = createGraphStageEscapeBridge();
    const adapter = {
      clearSelection: vi.fn(),
      focus: vi.fn(),
      hasSelection: vi.fn(() => true),
    };

    const detach = bridge.attach(adapter);
    expect(bridge.hasSelection()).toBe(true);
    bridge.clearSelection();
    bridge.focus();

    expect(adapter.clearSelection).toHaveBeenCalledOnce();
    expect(adapter.focus).toHaveBeenCalledOnce();

    detach();
    expect(bridge.hasSelection()).toBe(false);
    expect(() => bridge.clearSelection()).not.toThrow();
  });
});
