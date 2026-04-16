import { describe, expect, it } from 'vitest';
import { getStringSpecifier } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/stringSpecifier';

function createNode(
  overrides: Partial<{
    type: string;
    text: string;
    namedChildren: Array<{ type: string; text: string }>;
  }> = {},
) {
  return {
    type: 'string',
    text: '""',
    namedChildren: [],
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/stringSpecifier', () => {
  it('reads string fragment content before falling back to stripping quotes', () => {
    expect(
      getStringSpecifier(
        createNode({
          type: 'string',
          text: '"ignored"',
          namedChildren: [
            { type: 'escape_sequence', text: '\\n' },
            { type: 'string_fragment', text: 'codegraphy/runtime' },
          ],
        }) as never,
      ),
    ).toBe('codegraphy/runtime');

    expect(
      getStringSpecifier(
        createNode({
          type: 'string',
          text: '"codegraphy/runtime"',
          namedChildren: [],
        }) as never,
      ),
    ).toBe('codegraphy/runtime');

    expect(
      getStringSpecifier(
        createNode({
          type: 'string',
          text: '""',
          namedChildren: [],
        }) as never,
      ),
    ).toBe('');
  });

  it('reads interpreted string literal content and returns null for unsupported shapes', () => {
    expect(
      getStringSpecifier(
        createNode({
          type: 'interpreted_string_literal',
          namedChildren: [
            { type: 'quote', text: '"' },
            { type: 'interpreted_string_literal_content', text: './internal/helper' },
          ],
        }) as never,
      ),
    ).toBe('./internal/helper');

    expect(
      getStringSpecifier(
        createNode({
          type: 'interpreted_string_literal',
          namedChildren: [{ type: 'quote', text: '"' }],
        }) as never,
      ),
    ).toBeNull();
    expect(getStringSpecifier(createNode({ type: 'string', text: '"', namedChildren: [] }) as never)).toBeNull();
    expect(getStringSpecifier(createNode({ type: 'identifier', text: 'pkg', namedChildren: [] }) as never)).toBeNull();
    expect(getStringSpecifier(null)).toBeNull();
  });
});
