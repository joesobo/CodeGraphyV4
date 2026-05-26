import { describe, expect, it } from 'vitest';
import type { GraphContextNodeTarget } from '../../../../../src/webview/components/graph/contextMenu/decision/targets';
import { nodeMatches } from '../../../../../src/webview/components/graph/contextMenu/graphView/nodeMatching';

describe('graphView node matching', () => {
  it('matches runtime node type selectors only by runtime node type', () => {
    expect(nodeMatches(
      createTarget({ id: 'section-1', nodeType: 'file', runtimeNodeType: 'section' }),
      { kind: 'runtimeNodeType', runtimeNodeTypes: ['section'] },
    )).toBe(true);
    expect(nodeMatches(
      createTarget({ id: 'section-1', nodeType: 'section' }),
      { kind: 'runtimeNodeType', runtimeNodeTypes: ['section'] },
    )).toBe(false);
  });

  it('requires regular node selectors to satisfy node and runtime node filters', () => {
    const selector = { kind: 'node' as const, nodeTypes: ['file'], runtimeNodeTypes: ['section'] };

    expect(nodeMatches(createTarget({ id: 'node-1', nodeType: 'file', runtimeNodeType: 'section' }), selector)).toBe(true);
    expect(nodeMatches(createTarget({ id: 'node-1', nodeType: 'folder', runtimeNodeType: 'section' }), selector)).toBe(false);
    expect(nodeMatches(createTarget({ id: 'node-1', nodeType: 'file', runtimeNodeType: 'other' }), selector)).toBe(false);
  });

  it('allows missing selector filters', () => {
    expect(nodeMatches(createTarget({ id: 'node-1' }), { kind: 'node' })).toBe(true);
    expect(nodeMatches(createTarget({ id: 'node-1' }), { kind: 'multiSelection' })).toBe(true);
  });
});

function createTarget(overrides: Partial<GraphContextNodeTarget>): GraphContextNodeTarget {
  return {
    id: 'node-1',
    nodeKind: 'file',
    nodeType: 'file',
    ...overrides,
  };
}
