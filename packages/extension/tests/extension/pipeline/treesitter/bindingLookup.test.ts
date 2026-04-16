import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getImportedBindingByIdentifier,
  getImportedBindingByPropertyAccess,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/bindingLookup';
import { getIdentifierText } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/text';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/text', () => ({
  getIdentifierText: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'identifier',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/bindingLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves identifier bindings from the imported binding map', () => {
    const binding = { importedName: 'run', specifier: './run', resolvedPath: '/workspace/run.ts' };
    vi.mocked(getIdentifierText).mockReturnValue('run');

    expect(getImportedBindingByIdentifier(createNode() as never, new Map([['run', binding]]))).toBe(binding);
  });

  it('returns null when the identifier text is missing or unknown', () => {
    vi.mocked(getIdentifierText).mockReturnValueOnce(null).mockReturnValueOnce('missing');

    expect(getImportedBindingByIdentifier(createNode() as never, new Map())).toBeNull();
    expect(getImportedBindingByIdentifier(createNode() as never, new Map())).toBeNull();
  });

  it('reads property access objects from the requested field before falling back to the first named child', () => {
    const fieldNode = createNode({ type: 'identifier' });
    const fallbackNode = createNode({ type: 'identifier' });
    const fieldBinding = { importedName: 'services', specifier: './services', resolvedPath: null };
    const fallbackBinding = { importedName: 'pkg', specifier: './pkg', resolvedPath: null };
    vi.mocked(getIdentifierText).mockImplementation((node) => {
      if (node === fieldNode) {
        return 'services';
      }

      if (node === fallbackNode) {
        return 'pkg';
      }

      return null;
    });

    expect(
      getImportedBindingByPropertyAccess(
        createNode({
          type: 'selector_expression',
          namedChildren: [fallbackNode],
          childForFieldName: (name: string) => {
            expect(name).toBe('operand');
            return fieldNode;
          },
        }) as never,
        new Map([
          ['services', fieldBinding],
          ['pkg', fallbackBinding],
        ]),
        'selector_expression',
        'operand',
      ),
    ).toBe(fieldBinding);

    expect(
      getImportedBindingByPropertyAccess(
        createNode({
          type: 'selector_expression',
          namedChildren: [fallbackNode],
        }) as never,
        new Map([['pkg', fallbackBinding]]),
        'selector_expression',
        'operand',
      ),
    ).toBe(fallbackBinding);
  });

  it('returns null for mismatched access nodes', () => {
    expect(
      getImportedBindingByPropertyAccess(
        null,
        new Map(),
        'selector_expression',
        'operand',
      ),
    ).toBeNull();
    expect(
      getImportedBindingByPropertyAccess(
        createNode({ type: 'call_expression' }) as never,
        new Map(),
        'selector_expression',
        'operand',
      ),
    ).toBeNull();
    expect(getIdentifierText).not.toHaveBeenCalled();
  });
});
