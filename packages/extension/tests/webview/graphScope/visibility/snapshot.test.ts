import { describe, expect, it } from 'vitest';
import type { IGraphControlsSnapshot } from '../../../../src/shared/graphControls/contracts';

import { getGraphControlsScopeEnabled } from '../../../../src/webview/components/graphScope/visibility/snapshot';

const snapshot: IGraphControlsSnapshot = {
  nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#111', defaultVisible: true }],
  edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#222', defaultVisible: false }],
  nodeColors: {},
  nodeVisibility: { file: false },
  edgeVisibility: {},
};

describe('webview/graphScope/visibility/snapshot', () => {
  it('uses explicit node visibility', () => {
    expect(getGraphControlsScopeEnabled(snapshot, {
      scopeKind: 'node',
      scopeId: 'file',
    })).toBe(false);
  });

  it('falls back to an edge definition default', () => {
    expect(getGraphControlsScopeEnabled(snapshot, {
      scopeKind: 'edge',
      scopeId: 'import',
    })).toBe(false);
  });

  it('uses explicit edge visibility', () => {
    expect(getGraphControlsScopeEnabled({
      ...snapshot,
      edgeVisibility: { import: true },
    }, {
      scopeKind: 'edge',
      scopeId: 'import',
    })).toBe(true);
  });

  it('returns undefined when the requested kind has no matching definition', () => {
    expect(getGraphControlsScopeEnabled(snapshot, {
      scopeKind: 'edge',
      scopeId: 'file',
    })).toBeUndefined();
  });
});
