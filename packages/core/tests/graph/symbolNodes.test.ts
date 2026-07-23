import { describe, expect, it } from 'vitest';
import { createSymbolNode } from '../../src/graph/symbolNodes';

describe('core/graph/symbolNodes', () => {
  it('keeps language-specific property declarations under generic symbols', () => {
    const node = createSymbolNode(
      {
        id: 'property-symbol',
        filePath: '/workspace/src/model.ts',
        kind: '  Property  ',
        name: 'size',
      },
      'src/model.ts#size:property',
      '/workspace',
    );

    expect(node.nodeType).toBe('symbol');
    expect(node.symbol?.kind).toBe('property');
  });
});
