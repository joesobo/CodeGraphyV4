import { describe, expect, it } from 'vitest';
import {
  CORE_GRAPH_EDGE_TYPES,
  STRUCTURAL_NESTS_EDGE_KIND,
} from '../../../../src/shared/graphControls/defaults/edgeTypes';

describe('shared/graphControls/defaults/edgeTypes', () => {
  it('declares the structural nests edge and the built-in edge defaults', () => {
    expect(STRUCTURAL_NESTS_EDGE_KIND).toBe('codegraphy:nests');
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === STRUCTURAL_NESTS_EDGE_KIND)).toBe(true);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === 'import')).toBe(true);
    expect(CORE_GRAPH_EDGE_TYPES.some((definition) => definition.id === 'load')).toBe(true);
  });
});
