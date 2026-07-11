import { beforeEach, describe, expect, it, vi } from 'vitest';

import { graphStore } from '../../../../src/webview/store/state';
import {
  applyEdgeScopeVisibility,
  applyGraphScopeVisibility,
  applyNodeScopeVisibility,
  getGraphScopeProjectionRevision,
} from '../../../../src/webview/components/graphScope/visibility/projection';
import { resetGraphScopeVisibilityMessageQueueForTests } from '../../../../src/webview/components/graphScope/messages';

const { flushSync } = vi.hoisted(() => ({
  flushSync: vi.fn((apply: () => void) => { apply(); }),
}));

vi.mock('react-dom', () => ({ flushSync }));
vi.mock('../../../../src/webview/vscodeApi', () => ({ postMessage: vi.fn() }));

describe('webview/graphScope/visibility/projection', () => {
  beforeEach(() => {
		flushSync.mockClear();
    resetGraphScopeVisibilityMessageQueueForTests();
    graphStore.setState({
      graphHasIndex: true,
      graphNodeTypes: [
        { id: 'shared', label: 'Shared node', defaultColor: '#111', defaultVisible: true },
        { id: 'parent', label: 'Parent', defaultColor: '#222', defaultVisible: false },
        {
          id: 'child',
          label: 'Child',
          defaultColor: '#333',
          defaultVisible: false,
          parentId: 'parent',
        },
      ],
      graphEdgeTypes: [
        { id: 'import', label: 'Import', defaultColor: '#444', defaultVisible: true },
      ],
      graphScopeProjectionRevision: 4,
      nodeVisibility: { parent: false },
      edgeVisibility: { import: true },
    });
  });

  it('increments the revision and enables parents for a visible node', () => {
    applyNodeScopeVisibility(graphStore.getState().graphNodeTypes, 'child', true);

    expect(graphStore.getState().nodeVisibility).toMatchObject({ child: true, parent: true });
    expect(getGraphScopeProjectionRevision()).toBe(5);
		expect(flushSync).toHaveBeenCalledOnce();
  });

  it('increments the revision for an edge projection', () => {
    applyEdgeScopeVisibility('import', false);

    expect(graphStore.getState().edgeVisibility.import).toBe(false);
    expect(getGraphScopeProjectionRevision()).toBe(5);
		expect(flushSync).toHaveBeenCalledOnce();
  });

  it('requires both the requested scope kind and id to exist', () => {
    expect(applyGraphScopeVisibility({
      scopeKind: 'edge',
      scopeId: 'shared',
      enabled: false,
    })).toBe(false);
    expect(getGraphScopeProjectionRevision()).toBe(4);
  });
});
