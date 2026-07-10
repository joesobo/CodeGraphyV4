import { describe, expect, it } from 'vitest';

import { graphLayoutChanged } from '../../../../../src/webview/perf/graph/lifecycle/layout';

describe('webview/perf/graph/lifecycle/layout', () => {
  it('marks a newly defined layout as changed', () => {
    expect(graphLayoutChanged('uniform::a', undefined)).toBe(true);
  });

  it('does not mark an unchanged layout as changed', () => {
    expect(graphLayoutChanged('uniform::a', 'uniform::a')).toBe(false);
  });

  it('does not treat an empty graph as a layout change', () => {
    expect(graphLayoutChanged(undefined, 'uniform::a')).toBe(false);
  });
});
