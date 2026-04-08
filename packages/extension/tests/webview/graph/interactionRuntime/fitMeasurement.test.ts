import { describe, expect, it } from 'vitest';
import { getMeasuredSize } from '../../../../src/webview/components/graph/interactionRuntime/fitMeasurement';

describe('graph/interactionRuntime/fitMeasurement', () => {
  it('reads client size from a measurable element and falls back to zero', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'clientWidth', {
      configurable: true,
      value: 320,
    });

    expect(getMeasuredSize(element, 'clientWidth')).toBe(320);
    expect(getMeasuredSize(null, 'clientHeight')).toBe(0);
  });
});
