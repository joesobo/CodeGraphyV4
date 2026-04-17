import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleJavaScriptCallExpression } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/javascript/calls';
import {
  getImportedBindingByIdentifier,
  getImportedBindingByPropertyAccess,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/imports';
import { getImportRelationForJavaScriptCallExpression } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/javascript/callImports';
import { addCallRelation } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/imports', () => ({
  getImportedBindingByIdentifier: vi.fn(),
  getImportedBindingByPropertyAccess: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/javascript/callImports', () => ({
  getImportRelationForJavaScriptCallExpression: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addCallRelation: vi.fn(),
}));

function createNode(overrides: Partial<{
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/javascript/calls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records direct import relations before checking imported bindings', () => {
    const relations: Array<Record<string, unknown>> = [];
    const importRelation = {
      kind: 'import',
      fromFilePath: '/workspace/src/app.ts',
      sourceId: 'codegraphy.treesitter:dynamic-import',
    };

    vi.mocked(getImportRelationForJavaScriptCallExpression).mockReturnValue(importRelation as never);

    handleJavaScriptCallExpression(
      createNode() as never,
      '/workspace/src/app.ts',
      relations as never,
      new Map(),
      'symbol-id',
    );

    expect(relations).toEqual([importRelation]);
    expect(getImportedBindingByIdentifier).not.toHaveBeenCalled();
    expect(getImportedBindingByPropertyAccess).not.toHaveBeenCalled();
    expect(addCallRelation).not.toHaveBeenCalled();
  });

  it('adds call relations for identifier bindings and reuses the function field node', () => {
    const calleeNode = createNode();
    const binding = { importedName: 'render', specifier: './render', resolvedPath: '/workspace/src/render.ts' };

    vi.mocked(getImportRelationForJavaScriptCallExpression).mockReturnValue(null);
    vi.mocked(getImportedBindingByIdentifier).mockReturnValue(binding as never);

    handleJavaScriptCallExpression(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('function');
          return calleeNode;
        },
      }) as never,
      '/workspace/src/app.ts',
      [] as never,
      new Map(),
      'symbol-id',
    );

    expect(getImportedBindingByIdentifier).toHaveBeenCalledWith(calleeNode, expect.any(Map));
    expect(getImportedBindingByPropertyAccess).not.toHaveBeenCalled();
    expect(addCallRelation).toHaveBeenCalledWith(
      [],
      '/workspace/src/app.ts',
      binding,
      'symbol-id',
    );
  });

  it('falls back to the first named child and skips call relations when nothing resolves', () => {
    const fallbackCallee = createNode();

    vi.mocked(getImportRelationForJavaScriptCallExpression).mockReturnValue(null);
    vi.mocked(getImportedBindingByIdentifier).mockReturnValue(null);
    vi.mocked(getImportedBindingByPropertyAccess).mockReturnValue(null);

    handleJavaScriptCallExpression(
      createNode({
        namedChildren: [fallbackCallee],
      }) as never,
      '/workspace/src/app.ts',
      [] as never,
      new Map(),
    );

    expect(getImportedBindingByIdentifier).toHaveBeenCalledWith(fallbackCallee, expect.any(Map));
    expect(getImportedBindingByPropertyAccess).toHaveBeenCalledWith(
      fallbackCallee,
      expect.any(Map),
      'member_expression',
      'object',
    );
    expect(addCallRelation).not.toHaveBeenCalled();
  });
});
