import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePythonImportStatement } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/python/imports';
import {
  getIdentifierText,
  getLastPathSegment,
  getNodeText,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';
import { resolvePythonModulePath } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/paths';
import { addImportRelation } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
  getLastPathSegment: vi.fn((value: string, separator: string) => value.split(separator).at(-1) ?? null),
  getNodeText: vi.fn((node?: { text?: string } | null) => node?.text ?? null),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/paths', () => ({
  resolvePythonModulePath: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addImportRelation: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  namedChildren: Array<unknown>;
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'import_statement',
    text: '',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/python/imports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds import relations and bindings for dotted-name and aliased imports', () => {
    vi.mocked(getIdentifierText).mockReturnValueOnce('tools').mockReturnValueOnce(null);
    vi.mocked(resolvePythonModulePath)
      .mockReturnValueOnce('/workspace/pkg/codegraphy/tools.py')
      .mockReturnValueOnce('/workspace/pkg/codegraphy/runtime.py');

    const importedBindings = new Map();
    const relations: never[] = [];
    const aliasedImport = createNode({
      type: 'aliased_import',
      namedChildren: [{ type: 'dotted_name', text: 'codegraphy.tools' }],
      childForFieldName: (name) =>
        name === 'name'
          ? { type: 'dotted_name', text: 'codegraphy.tools' }
          : name === 'alias'
            ? { type: 'identifier', text: 'tools' }
            : null,
    });
    const dottedImport = createNode({
      type: 'dotted_name',
      text: 'codegraphy.runtime',
    });

    expect(
      handlePythonImportStatement(
        createNode({ namedChildren: [aliasedImport, dottedImport] }) as never,
        '/workspace/pkg/app.py',
        '/workspace',
        relations,
        importedBindings as never,
      ),
    ).toEqual({ skipChildren: true });

    expect(addImportRelation).toHaveBeenNthCalledWith(
      1,
      relations,
      '/workspace/pkg/app.py',
      'codegraphy.tools',
      '/workspace/pkg/codegraphy/tools.py',
    );
    expect(addImportRelation).toHaveBeenNthCalledWith(
      2,
      relations,
      '/workspace/pkg/app.py',
      'codegraphy.runtime',
      '/workspace/pkg/codegraphy/runtime.py',
    );
    expect(importedBindings.get('tools')).toEqual({
      importedName: 'codegraphy.tools',
      resolvedPath: '/workspace/pkg/codegraphy/tools.py',
      specifier: 'codegraphy.tools',
    });
    expect(importedBindings.get('runtime')).toEqual({
      importedName: 'codegraphy.runtime',
      resolvedPath: '/workspace/pkg/codegraphy/runtime.py',
      specifier: 'codegraphy.runtime',
    });
    expect(getLastPathSegment).toHaveBeenCalledWith('codegraphy.runtime', '.');
  });

  it('ignores non-module children and falls back to the first named child for aliased imports', () => {
    vi.mocked(getIdentifierText).mockReturnValue('alias_tools');
    vi.mocked(resolvePythonModulePath).mockReturnValue('/workspace/pkg/codegraphy/tools.py');
    const importedBindings = new Map();
    const relations: never[] = [];
    const fallbackNameNode = { type: 'dotted_name', text: 'codegraphy.tools' };
    const childForFieldName = vi.fn((name: string) => {
      expect(['name', 'alias']).toContain(name);
      return name === 'alias' ? { type: 'identifier', text: 'alias_tools' } : null;
    });
    const aliasedImport = createNode({
      type: 'aliased_import',
      namedChildren: [fallbackNameNode],
      childForFieldName,
    });

    handlePythonImportStatement(
      createNode({
        namedChildren: [createNode({ type: 'identifier', text: 'ignored' }), aliasedImport],
      }) as never,
      '/workspace/pkg/app.py',
      '/workspace',
      relations,
      importedBindings as never,
    );

    expect(resolvePythonModulePath).toHaveBeenCalledTimes(1);
    expect(resolvePythonModulePath).toHaveBeenCalledWith(
      '/workspace/pkg/app.py',
      '/workspace',
      'codegraphy.tools',
    );
    expect(addImportRelation).toHaveBeenCalledTimes(1);
    expect(importedBindings.get('alias_tools')).toEqual({
      importedName: 'codegraphy.tools',
      resolvedPath: '/workspace/pkg/codegraphy/tools.py',
      specifier: 'codegraphy.tools',
    });
    expect(getNodeText).toHaveBeenCalledWith(fallbackNameNode);
    expect(getIdentifierText).toHaveBeenCalledWith({ type: 'identifier', text: 'alias_tools' });
  });

  it('skips import entries without a resolved specifier', () => {
    vi.mocked(getNodeText).mockReturnValue(null);
    const importedBindings = new Map();
    const relations: never[] = [];

    handlePythonImportStatement(
      createNode({
        namedChildren: [createNode({ type: 'dotted_name', text: 'ignored' })],
      }) as never,
      '/workspace/pkg/app.py',
      '/workspace',
      relations,
      importedBindings as never,
    );

    expect(resolvePythonModulePath).not.toHaveBeenCalled();
    expect(addImportRelation).not.toHaveBeenCalled();
    expect(importedBindings.size).toBe(0);
  });
});
