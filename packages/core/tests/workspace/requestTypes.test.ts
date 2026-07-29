import { describe, expectTypeOf, it } from 'vitest';
import type { WorkspaceGraphQueryInput } from '../../src/workspace/requestTypes';

describe('workspace request types', () => {
  it('associates each Graph Query report with its arguments', () => {
    const nodes = {
      report: 'nodes',
      arguments: { limit: 10 },
    } satisfies WorkspaceGraphQueryInput;
    const overview = {
      report: 'overview',
      arguments: { target: 'src/index.ts' },
    } satisfies WorkspaceGraphQueryInput;

    expectTypeOf(nodes.report).toEqualTypeOf<'nodes'>();
    expectTypeOf(overview.arguments.target).toEqualTypeOf<string>();

    const invalidNodes = {
      report: 'nodes',
      // @ts-expect-error Target selectors are not valid for Node reports.
      arguments: { target: 'src/index.ts' },
    } satisfies WorkspaceGraphQueryInput;
    expectTypeOf(invalidNodes.report).toEqualTypeOf<'nodes'>();
  });
});
