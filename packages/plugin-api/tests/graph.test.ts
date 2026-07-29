import { describe, expectTypeOf, it } from 'vitest';

import type { CoreEdgeKind } from '../src/graph';

describe('Plugin API Graph', () => {
  it('includes reexports in the Core Relationship vocabulary', () => {
    expectTypeOf<'reexport'>().toMatchTypeOf<CoreEdgeKind>();
  });
});
