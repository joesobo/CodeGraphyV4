import { describe, expect, it } from 'vitest';
import type { IGraphControlsSnapshot } from '../../../../../src/shared/graphControls/contracts';

import { createGraphControlsStatePatch } from '../../../../../src/webview/store/messageHandlers/graphControls/patch';

const payload: IGraphControlsSnapshot = {
  nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#111', defaultVisible: true }],
  edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#222', defaultVisible: true }],
  nodeColors: { file: '#111' },
  nodeVisibility: { file: true },
  edgeVisibility: { import: true },
};

function state() {
  return {
    graphNodeTypes: payload.nodeTypes,
    graphEdgeTypes: payload.edgeTypes,
    nodeColors: payload.nodeColors,
    nodeVisibility: payload.nodeVisibility,
    edgeVisibility: payload.edgeVisibility,
    graphScopeProjectionRevision: 8,
  };
}

describe('webview/store/messageHandlers/graphControls/patch', () => {
  it('returns no changes for a semantic host echo', () => {
    expect(createGraphControlsStatePatch(state(), {
      ...payload,
      nodeVisibility: { file: true },
      edgeVisibility: { import: true },
    })).toEqual({});
  });

  it('advances the projection revision for node visibility changes', () => {
    expect(createGraphControlsStatePatch(state(), {
      ...payload,
      nodeVisibility: { file: false },
    })).toEqual({
      graphScopeProjectionRevision: 9,
      nodeVisibility: { file: false },
    });
  });

  it('advances the projection revision for edge visibility changes', () => {
    expect(createGraphControlsStatePatch(state(), {
      ...payload,
      edgeVisibility: { import: false },
    })).toEqual({
      edgeVisibility: { import: false },
      graphScopeProjectionRevision: 9,
    });
  });

  it('does not advance the projection revision for non-visibility changes', () => {
    expect(createGraphControlsStatePatch(state(), {
      ...payload,
      nodeColors: { file: '#333' },
    })).toEqual({ nodeColors: { file: '#333' } });
  });

  it('patches changed node definitions', () => {
    const nodeTypes = [
      ...payload.nodeTypes,
      { id: 'folder', label: 'Folder', defaultColor: '#333', defaultVisible: true },
    ];

    expect(createGraphControlsStatePatch(state(), { ...payload, nodeTypes })).toEqual({
      graphNodeTypes: nodeTypes,
    });
  });

  it('patches changed edge definitions', () => {
    const edgeTypes: IGraphControlsSnapshot['edgeTypes'] = [
      ...payload.edgeTypes,
      { id: 'nests', label: 'Nests', defaultColor: '#333', defaultVisible: true },
    ];

    expect(createGraphControlsStatePatch(state(), { ...payload, edgeTypes })).toEqual({
      graphEdgeTypes: edgeTypes,
    });
  });
});
