import { describe, expect, it } from 'vitest';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

describe('extension/graphViewProvider', () => {
  it('exposes the graph view type', () => {
    expect(GraphViewProvider.viewType).toBe('codegraphy.graphView');
  });
});
