import { describe, expect, it } from 'vitest';
import {
  CORE_GRAPH_EDGE_DEFAULT_VISIBILITY,
  CORE_GRAPH_EDGE_TYPES,
} from '../../src/graphScope/defaults';

describe('graphScope/defaults', () => {
  it('does not declare bundled plugin edges as Core defaults', () => {
    expect(CORE_GRAPH_EDGE_TYPES).not.toContain('codegraphy.gdscript:signal-connection');
  });

  it('defines visibility for every built-in edge type', () => {
    expect(Object.keys(CORE_GRAPH_EDGE_DEFAULT_VISIBILITY).sort()).toEqual(
      [...CORE_GRAPH_EDGE_TYPES].sort(),
    );
  });

  it('shows structural imports while hiding detailed symbol edges by default', () => {
    expect(CORE_GRAPH_EDGE_DEFAULT_VISIBILITY.import).toBe(true);
    expect(CORE_GRAPH_EDGE_DEFAULT_VISIBILITY.using).toBe(true);
    expect(CORE_GRAPH_EDGE_DEFAULT_VISIBILITY.call).toBe(false);
    expect(CORE_GRAPH_EDGE_DEFAULT_VISIBILITY.reference).toBe(false);
  });
});
