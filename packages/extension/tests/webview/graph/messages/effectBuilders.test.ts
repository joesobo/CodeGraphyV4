import { describe, expect, it } from 'vitest';
import {
  EMPTY_EFFECTS,
  getAccessCountEffects,
  getExportEffects,
  getFileInfoEffects,
  getFitViewEffects,
  getGraphRuntimeStateEffects,
  getNodeBoundsEffects,
  getZoomEffects,
} from '../../../../src/webview/components/graph/messages/effectBuilders';

describe('graph/messages/effectBuilders', () => {
  it('re-exports the graph message effect helpers', () => {
    expect(EMPTY_EFFECTS).toEqual([]);
    expect(typeof getFitViewEffects).toBe('function');
    expect(typeof getZoomEffects).toBe('function');
    expect(typeof getFileInfoEffects).toBe('function');
    expect(typeof getNodeBoundsEffects).toBe('function');
    expect(typeof getGraphRuntimeStateEffects).toBe('function');
    expect(typeof getExportEffects).toBe('function');
    expect(typeof getAccessCountEffects).toBe('function');
  });
});
