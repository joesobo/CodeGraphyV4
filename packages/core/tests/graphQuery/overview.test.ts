import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphData } from '../../src/graph/contracts';
import { inspectGraphTarget } from '../../src/graphQuery/overview';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/command.ts', label: 'command.ts', nodeType: 'file' },
    { id: 'src/settings.ts', label: 'settings.ts', nodeType: 'file' },
    { id: 'tests/command.test.ts', label: 'command.test.ts', nodeType: 'file' },
    {
      id: 'src/command.ts#runCommand:function',
      label: 'runCommand',
      nodeType: 'symbol:function',
      symbol: {
        id: 'src/command.ts#runCommand:function',
        filePath: 'src/command.ts',
        name: 'runCommand',
        kind: 'function',
      },
    },
  ],
  edges: [
    { id: 'command-settings', from: 'src/command.ts', to: 'src/settings.ts', kind: 'import', sources: [] },
    { id: 'test-command', from: 'tests/command.test.ts', to: 'src/command.ts', kind: 'import', sources: [] },
    {
      id: 'command-symbol',
      from: 'src/command.ts',
      to: 'src/command.ts#runCommand:function',
      kind: 'contains',
      sources: [],
    },
  ],
};

const symbols: IAnalysisSymbol[] = [{
  id: 'src/command.ts#runCommand:function',
  filePath: 'src/command.ts',
  name: 'runCommand',
  kind: 'function',
}];

const relations: IAnalysisRelation[] = [
  {
    kind: 'import',
    sourceId: 'core:typescript:import',
    fromFilePath: 'src/command.ts',
    toFilePath: 'src/settings.ts',
  },
  {
    kind: 'import',
    sourceId: 'core:typescript:import',
    fromFilePath: 'tests/command.test.ts',
    toFilePath: 'src/command.ts',
  },
];

describe('core/graphQuery target overview', () => {
  it('returns declarations plus incoming and outgoing Relationships for one exact target', () => {
    const result = inspectGraphTarget({ graphData, symbols, relations }, { target: 'src/command.ts' });

    expect(result).toMatchObject({
      target: { path: 'src/command.ts', nodeType: 'file' },
      declaredSymbols: {
        symbols: [{
          id: 'src/command.ts#runCommand:function',
          filePath: 'src/command.ts',
          name: 'runCommand',
          kind: 'function',
        }],
        page: { returned: 1, total: 1, nextOffset: null },
      },
      outgoing: {
        edges: [{ from: 'src/command.ts', to: 'src/settings.ts', edgeTypes: ['import'] }],
        page: { returned: 1, total: 1, nextOffset: null },
      },
      incoming: {
        edges: [{ from: 'tests/command.test.ts', to: 'src/command.ts', edgeTypes: ['import'] }],
        page: { returned: 1, total: 1, nextOffset: null },
      },
      limits: { declaredSymbols: 25, relationshipsPerDirection: 25 },
    });
  });

  it('returns a typed error when the exact target is absent', () => {
    expect(inspectGraphTarget({ graphData, symbols, relations }, { target: 'src/missing.ts' })).toEqual({
      error: 'query_target_not_found',
      message: 'No indexed Node or Symbol has the exact id: src/missing.ts',
    });
  });
});
