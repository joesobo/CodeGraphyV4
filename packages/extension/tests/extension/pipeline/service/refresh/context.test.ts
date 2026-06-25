import { describe, expect, it } from 'vitest';
import { EMPTY_REFRESH_GRAPH } from '../../../../../src/extension/pipeline/service/refresh/context';

describe('extension/pipeline/service/refresh/context', () => {
  it('uses an empty graph shape for refresh fallbacks', () => {
    expect(EMPTY_REFRESH_GRAPH).toEqual({
      nodes: [],
      edges: [],
    });
  });
});
