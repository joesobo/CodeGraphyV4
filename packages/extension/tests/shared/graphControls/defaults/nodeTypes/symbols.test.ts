import { describe, expect, it } from 'vitest';
import { createSymbolGraphNodeTypes } from '../../../../../src/shared/graphControls/defaults/nodeTypes/symbols';

describe('shared/graphControls/defaults/nodeTypes/symbols', () => {
  it('keeps the symbol catalog in matching-precedence order', () => {
    expect(createSymbolGraphNodeTypes().map(({ id }) => id)).toEqual([
      'symbol',
      'symbol:function',
      'symbol:namespace',
      'symbol:callable',
      'symbol:method',
      'symbol:constructor',
      'symbol:prototype',
      'symbol:class',
      'symbol:mixin',
      'symbol:extension',
      'symbol:interface',
      'symbol:record',
      'symbol:delegate',
      'symbol:property',
      'symbol:event',
      'symbol:type',
      'symbol:struct',
      'symbol:union',
      'symbol:enum',
      'symbol:typedef',
      'symbol:alias',
      'symbol:template',
      'plugin:codegraphy.gdscript:symbol:scene',
      'plugin:codegraphy.gdscript:symbol:resource',
      'plugin:codegraphy.gdscript:symbol:autoload',
      'plugin:codegraphy.gdscript:symbol:scene-node',
      'plugin:codegraphy.gdscript:symbol:signal',
    ]);
  });
});
