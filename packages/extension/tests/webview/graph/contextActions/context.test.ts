import { describe, expect, it } from 'vitest';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';

describe('graph/contextActions/context', () => {
  it('keeps node selections separate from edge endpoint facts', () => {
    const context = resolveGraphContextActionContext({
      kind: 'node',
      targets: ['from.ts', 'to.ts'],
    });

    expect(context).toEqual({
      selectionKind: 'node',
      targetIds: ['from.ts', 'to.ts'],
      primaryTargetId: 'from.ts',
      edgeSourceId: undefined,
      edgeTargetId: undefined,
      mutationDirectory: 'from.ts',
      availableNodes: undefined,
      timelineActive: false,
    });
  });

  it('resolves edge endpoint facts from edge selections', () => {
    const context = resolveGraphContextActionContext({
      kind: 'edge',
      edgeId: 'from.ts->to.ts',
      targets: ['from.ts', 'to.ts'],
    });

    expect(context.edgeSourceId).toBe('from.ts');
    expect(context.edgeTargetId).toBe('to.ts');
  });
});
