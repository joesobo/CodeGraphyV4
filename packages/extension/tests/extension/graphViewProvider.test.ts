import { describe, expect, it } from 'vitest';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

describe('extension/graphViewProvider', () => {
  it('exposes the search, graph, and timeline view types', () => {
    expect(GraphViewProvider.searchViewType).toBe('codegraphy.searchControlsView');
    expect(GraphViewProvider.viewType).toBe('codegraphy.graphView');
    expect(GraphViewProvider.timelineViewType).toBe('codegraphy.timelineView');
  });
});
