import { describe, expect, it } from 'vitest';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

describe('extension/graphViewProvider', () => {
  it('exposes only the graph view type', () => {
    expect(GraphViewProvider.viewType).toBe('codegraphy.graphView');
    expect(GraphViewProvider).not.toHaveProperty('timelineViewType');
  });
});
