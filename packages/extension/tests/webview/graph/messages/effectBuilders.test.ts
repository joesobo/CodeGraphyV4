import { describe, expect, it } from 'vitest';
import {
  getAccessCountEffects,
  getFileInfoEffects,
} from '../../../../src/webview/components/graph/messages/fileInfo';
import {
  EMPTY_EFFECTS,
  getExportEffects,
  getFitViewEffects,
  getGraphRuntimeStateEffects,
  getNodeBoundsEffects,
  getZoomEffects,
} from '../../../../src/webview/components/graph/messages/graphRuntime';

describe('graph/messages/effectBuilders', () => {
  it('exposes the graph message effect helpers from their owning modules', () => {
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
