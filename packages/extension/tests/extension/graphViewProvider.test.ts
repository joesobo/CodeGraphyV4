import { describe, expect, it } from 'vitest';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

describe('extension/graphViewProvider', () => {
  it('exposes the graph and timeline view types', () => {
    expect(GraphViewProvider.viewType).toBe('codegraphy.graphView');
    expect(GraphViewProvider.timelineViewType).toBe('codegraphy.timelineView');
  });
});
