import { describe, expect, it } from 'vitest';
import type { IGraphEdgeTypeDefinition } from '../../../../src/shared/graphControls/contracts';

import {
  buildGraphScopeInventory,
  resolveAvailableEdgeTypes,
} from '../../../../src/webview/components/graphScope/visibility/inventory';

const edgeTypes: IGraphEdgeTypeDefinition[] = [
  { id: 'nests', label: 'Nests', defaultColor: '#111', defaultVisible: true },
  { id: 'import', label: 'Import', defaultColor: '#222', defaultVisible: true },
  {
    id: 'overrides',
    label: 'Override',
    defaultColor: '#333',
    defaultVisible: false,
    requiresEdgeType: 'import',
  },
];

describe('webview/graphScope/visibility/inventory', () => {
  it('sorts node rows before edge rows and each kind by id', () => {
    expect(buildGraphScopeInventory({
      graphNodeTypes: [
        { id: 'symbol', label: 'Symbol', defaultColor: '#111', defaultVisible: false },
        { id: 'file', label: 'File', defaultColor: '#222', defaultVisible: true },
      ],
      graphEdgeTypes: edgeTypes,
      graphHasIndex: true,
      nodeVisibility: { folder: true },
      edgeVisibility: { import: true },
    }).map(entry => `${entry.scopeKind}:${entry.scopeId}`)).toEqual([
      'node:file',
      'node:symbol',
      'edge:import',
      'edge:nests',
      'edge:overrides',
    ]);
  });

  it('hides the structural edge when folders are absent or disabled', () => {
    expect(resolveAvailableEdgeTypes(edgeTypes, { import: true }, true, {}).map(
      edgeType => edgeType.id,
    )).toEqual(['import', 'overrides']);
  });

  it('shows only the structural edge before an index exists', () => {
    expect(resolveAvailableEdgeTypes(edgeTypes, { import: true }, false, { folder: true }).map(
      edgeType => edgeType.id,
    )).toEqual(['nests']);
  });

  it('requires a prerequisite edge unless the dependent edge is already enabled', () => {
    expect(resolveAvailableEdgeTypes(edgeTypes, {}, true, { folder: true }).map(
      edgeType => edgeType.id,
    )).toEqual(['nests', 'import']);
    expect(resolveAvailableEdgeTypes(edgeTypes, { overrides: true }, true, { folder: true }).map(
      edgeType => edgeType.id,
    )).toEqual(['nests', 'import', 'overrides']);
  });
});
