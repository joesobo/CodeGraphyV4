import { describe, expect, it } from 'vitest';
import { scaleMetricValue } from '../../../../../src/webview/components/graph/model/sizing/range';

describe('graph/model/sizing/range', () => {

  it('scales a metric value into the requested output range', () => {
    expect(scaleMetricValue(5, 0, 10, 8, 32)).toBe(20);
  });
});
