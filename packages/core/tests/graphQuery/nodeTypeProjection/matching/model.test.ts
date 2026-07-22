import { describe, expect, it } from 'vitest';
import { nodeMatchesProjectedNodeTypes } from '../../../../src/graphQuery/nodeTypeProjection/matching/model';

const functionNode = {
  id: 'src/app.ts#run:function',
  label: 'run',
  color: '#000000',
  nodeType: 'symbol:function',
  symbol: {
    id: 'src/app.ts:function:run',
    name: 'run',
    kind: 'function',
    filePath: 'src/app.ts',
  },
};

describe('graph query Node Type matching', () => {
  it('matches overlapping and parent Node Types by symbol semantics', () => {
    expect(nodeMatchesProjectedNodeTypes(functionNode, ['symbol:callable'])).toBe(true);
    expect(nodeMatchesProjectedNodeTypes(functionNode, ['variable'])).toBe(false);
  });

  it('matches the symbol parent independently of known symbol definitions', () => {
    const unknownSymbolNode = {
      ...functionNode,
      nodeType: 'plugin:example:unknown',
      symbol: {
        ...functionNode.symbol,
        kind: 'plugin-specific-kind',
      },
    };

    expect(nodeMatchesProjectedNodeTypes(unknownSymbolNode, ['symbol'])).toBe(true);
    expect(nodeMatchesProjectedNodeTypes(unknownSymbolNode, ['variable'])).toBe(false);
  });

  it('matches variable descendants through their parent Node Type', () => {
    const constantNode = {
      ...functionNode,
      id: 'src/app.ts#answer:constant',
      nodeType: 'symbol:constant',
      symbol: {
        ...functionNode.symbol,
        id: 'src/app.ts:constant:answer',
        name: 'answer',
        kind: 'constant',
      },
    };

    expect(nodeMatchesProjectedNodeTypes(constantNode, ['variable'])).toBe(true);
    expect(nodeMatchesProjectedNodeTypes(constantNode, ['symbol:callable'])).toBe(false);
  });

  it('requires exact Node Types for non-symbol and unknown projections', () => {
    const fileNode = {
      id: 'src/app.ts',
      label: 'app.ts',
      color: '#000000',
      nodeType: 'file',
    };

    expect(nodeMatchesProjectedNodeTypes(fileNode, ['file'])).toBe(true);
    expect(nodeMatchesProjectedNodeTypes(fileNode, ['symbol'])).toBe(false);
    expect(nodeMatchesProjectedNodeTypes(functionNode, ['plugin:example:unknown'])).toBe(false);
  });

  it('matches when any one requested Node Type applies', () => {
    expect(nodeMatchesProjectedNodeTypes(functionNode, ['variable', 'symbol:callable'])).toBe(true);
  });
});
