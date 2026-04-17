import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleJavaScriptExportStatement,
  handleJavaScriptImportStatement,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/javascript/imports';

const {
  resolveTreeSitterImportPath,
  collectImportBindings,
  getStringSpecifier,
  addImportRelation,
  addRelation,
} = vi.hoisted(() => ({
  resolveTreeSitterImportPath: vi.fn(),
  collectImportBindings: vi.fn(),
  getStringSpecifier: vi.fn(),
  addImportRelation: vi.fn(),
  addRelation: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/resolve', () => ({
  resolveTreeSitterImportPath,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/imports', () => ({
  collectImportBindings,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getStringSpecifier,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addImportRelation,
  addRelation,
}));

describe('extension/pipeline/treesitter/javascriptImports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveTreeSitterImportPath.mockReset();
    collectImportBindings.mockReset();
    getStringSpecifier.mockReset();
    addImportRelation.mockReset();
    addRelation.mockReset();
  });

  it('collects bindings and import relations when an import specifier exists', () => {
    resolveTreeSitterImportPath.mockReturnValue('/workspace/src/lib.ts');
    getStringSpecifier.mockReturnValue('./lib');
    const importedBindings = new Map();
    const relations: never[] = [];

    expect(
      handleJavaScriptImportStatement(
        { namedChildren: [{ type: 'identifier' }, { type: 'string' }] } as never,
        '/workspace/src/app.ts',
        relations,
        importedBindings as never,
      ),
    ).toEqual({ skipChildren: true });
    expect(getStringSpecifier).toHaveBeenCalledWith({ type: 'string' });
    expect(resolveTreeSitterImportPath).toHaveBeenCalledWith('/workspace/src/app.ts', './lib');
    expect(collectImportBindings).toHaveBeenCalledWith(
      { namedChildren: [{ type: 'identifier' }, { type: 'string' }] },
      './lib',
      '/workspace/src/lib.ts',
      importedBindings,
    );
    expect(addImportRelation).toHaveBeenCalledWith(
      relations,
      '/workspace/src/app.ts',
      './lib',
      '/workspace/src/lib.ts',
    );
  });

  it('skips import relation work when no string specifier exists', () => {
    getStringSpecifier.mockReturnValue(null);

    expect(
      handleJavaScriptImportStatement(
        { namedChildren: [{ type: 'identifier' }] } as never,
        '/workspace/src/app.ts',
        [] as never[],
        new Map() as never,
      ),
    ).toEqual({ skipChildren: true });
    expect(resolveTreeSitterImportPath).not.toHaveBeenCalled();
    expect(collectImportBindings).not.toHaveBeenCalled();
    expect(addImportRelation).not.toHaveBeenCalled();
  });

  it('adds reexport relations only when an export specifier exists', () => {
    resolveTreeSitterImportPath.mockReturnValue('/workspace/src/lib.ts');
    getStringSpecifier.mockReturnValueOnce('./lib').mockReturnValueOnce(null);
    const stringNode = { type: 'string' };
    const relations: never[] = [];

    handleJavaScriptExportStatement(
      { namedChildren: [{ type: 'identifier' }, stringNode] } as never,
      '/workspace/src/app.ts',
      relations,
    );
    handleJavaScriptExportStatement(
      { namedChildren: [{ type: 'identifier' }] } as never,
      '/workspace/src/app.ts',
      relations,
    );

    expect(getStringSpecifier).toHaveBeenNthCalledWith(1, stringNode);
    expect(getStringSpecifier).toHaveBeenNthCalledWith(2, undefined);
    expect(addRelation).toHaveBeenCalledTimes(1);
    expect(addRelation).toHaveBeenCalledWith(relations, {
      kind: 'reexport',
      sourceId: 'codegraphy.treesitter:reexport',
      fromFilePath: '/workspace/src/app.ts',
      specifier: './lib',
      resolvedPath: '/workspace/src/lib.ts',
      toFilePath: '/workspace/src/lib.ts',
    });
  });
});
