import { describe, expect, it } from 'vitest';
import { readTooltipSymbol } from '../../../../src/webview/components/graph/tooltip/symbol';

describe('graph/tooltip/symbol', () => {
  it('does not infer interface labels from Core symbol sources', () => {
    expect(readTooltipSymbol('src/app.ts#ready:function', {
      nodes: [
        {
          id: 'src/app.ts#ready:function',
          label: 'ready',
          color: '#8B5CF6',
          symbol: {
            id: 'src/app.ts#ready:function',
            filePath: 'src/app.ts',
            name: 'ready',
            kind: 'function',
            source: 'codegraphy.gdscript',
          },
        },
      ],
    })).toEqual({
      name: 'ready',
      kind: 'function',
      filePath: 'src/app.ts',
    });
  });

  it('omits plugin display metadata for unknown or missing symbol sources', () => {
    const unknownSourceSymbol = readTooltipSymbol('src/app.ts#ready:function', {
      nodes: [
        {
          id: 'src/app.ts#ready:function',
          label: 'ready',
          color: '#8B5CF6',
          symbol: {
            id: 'src/app.ts#ready:function',
            filePath: 'src/app.ts',
            name: 'ready',
            kind: 'function',
            source: 'unknown.plugin',
          },
        },
      ],
    });

    expect(unknownSourceSymbol).toStrictEqual({
      name: 'ready',
      kind: 'function',
      filePath: 'src/app.ts',
    });
    expect(unknownSourceSymbol).not.toHaveProperty('plugin');

    const missingSourceSymbol = readTooltipSymbol('src/app.ts#ready:function', {
      nodes: [
        {
          id: 'src/app.ts#ready:function',
          label: 'ready',
          color: '#8B5CF6',
          symbol: {
            id: 'src/app.ts#ready:function',
            filePath: 'src/app.ts',
            name: 'ready',
            kind: 'function',
          },
        },
      ],
    });

    expect(missingSourceSymbol).toStrictEqual({
      name: 'ready',
      kind: 'function',
      filePath: 'src/app.ts',
    });
    expect(missingSourceSymbol).not.toHaveProperty('plugin');
  });

  it('reads symbol metadata from the matching node id', () => {
    expect(readTooltipSymbol('src/target.ts#ready:function', {
      nodes: [
        {
          id: 'src/other.ts#start:function',
          label: 'start',
          color: '#8B5CF6',
          symbol: {
            id: 'src/other.ts#start:function',
            filePath: 'src/other.ts',
            name: 'start',
            kind: 'function',
          },
        },
        {
          id: 'src/target.ts#ready:function',
          label: 'ready',
          color: '#8B5CF6',
          symbol: {
            id: 'src/target.ts#ready:function',
            filePath: 'src/target.ts',
            name: 'ready',
            kind: 'function',
          },
        },
      ],
    })).toStrictEqual({
      name: 'ready',
      kind: 'function',
      filePath: 'src/target.ts',
    });
  });

  it('returns undefined when the node has no symbol metadata', () => {
    expect(readTooltipSymbol('src/app.ts', {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' }],
    })).toBeUndefined();
  });

  it('returns undefined when the node id is missing from the snapshot', () => {
    expect(readTooltipSymbol('src/missing.ts', {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' }],
    })).toBeUndefined();
  });
});
