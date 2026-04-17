import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPythonImportedName,
  getPythonImportFromImportedNodes,
  getPythonImportFromModuleNode,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzePython/importFromNodes';
import { getNodeText } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getNodeText: vi.fn((node?: { text?: string } | null) => node?.text ?? null),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'identifier',
    text: '',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzePython/importFromNodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects the first relative or dotted module node', () => {
    const dottedName = createNode({ type: 'dotted_name', text: 'pkg.services' });
    const relativeImport = createNode({ type: 'relative_import', text: '.pkg' });

    expect(
      getPythonImportFromModuleNode(
        createNode({
          namedChildren: [
            createNode({ type: 'comment' }),
            dottedName,
            relativeImport,
          ],
        }) as never,
      ),
    ).toBe(dottedName);

    expect(
      getPythonImportFromModuleNode(
        createNode({
          namedChildren: [createNode({ type: 'comment' }), relativeImport],
        }) as never,
      ),
    ).toBe(relativeImport);
  });

  it('filters imported nodes to dotted or aliased names while excluding the module node', () => {
    const moduleNode = createNode({ type: 'relative_import', text: '.pkg' });
    const dottedName = createNode({ type: 'dotted_name', text: 'pkg.services' });
    const aliasNode = createNode({ type: 'aliased_import', text: 'run as execute' });

    expect(
      getPythonImportFromImportedNodes(
        createNode({
          namedChildren: [moduleNode, dottedName, aliasNode, createNode({ type: 'identifier', text: 'ignored' })],
        }) as never,
        moduleNode as never,
      ),
    ).toEqual([dottedName, aliasNode]);
  });

  it('reads imported names from alias targets and plain nodes', () => {
    expect(
      getPythonImportedName(
        createNode({
          type: 'aliased_import',
          childForFieldName: (name: string) => (name === 'name' ? createNode({ text: 'pkg.run' }) : null),
        }) as never,
      ),
    ).toBe('pkg.run');

    expect(
      getPythonImportedName(
        createNode({
          type: 'aliased_import',
          namedChildren: [createNode({ text: 'pkg.fallback' })],
        }) as never,
      ),
    ).toBe('pkg.fallback');

    expect(getPythonImportedName(createNode({ type: 'dotted_name', text: 'pkg.execute' }) as never)).toBe('pkg.execute');
    expect(getNodeText).toHaveBeenCalled();
  });
});
