import { describe, expect, it, vi } from 'vitest';
import { handleRustUseDeclaration } from '../../../src/treeSitter/runtime/analyzeRust/imports';
import { resolveRustUsePath } from '../../../src/treeSitter/runtime/analyzeRust/paths';

vi.mock('../../../src/treeSitter/runtime/analyzeRust/paths', () => ({
  resolveRustUsePath: vi.fn(),
}));

function createNode(argumentText: string | null) {
  return {
    childForFieldName(name: string) {
      expect(name).toBe('argument');

      return argumentText === null
        ? null
        : {
            type: 'scoped_identifier',
            text: argumentText,
          };
    },
  };
}

describe('treeSitter/runtime/analyzeRust/imports', () => {
  it('skips Rust use declarations without a readable argument', () => {
    const relations: Array<Record<string, unknown>> = [];
    const importedBindings = new Map();

    handleRustUseDeclaration(
      createNode(null) as never,
      '/workspace/src/lib.rs',
      '/workspace',
      relations as never,
      importedBindings,
    );

    expect(relations).toEqual([]);
    expect(importedBindings.size).toBe(0);
    expect(resolveRustUsePath).not.toHaveBeenCalled();
  });

  it('adds import relations and imported bindings for Rust use declarations', () => {
    vi.mocked(resolveRustUsePath).mockReturnValue('/workspace/src/routes.rs');

    const relations: Array<Record<string, unknown>> = [];
    const importedBindings = new Map();

    handleRustUseDeclaration(
      createNode('crate::http::routes') as never,
      '/workspace/src/lib.rs',
      '/workspace',
      relations as never,
      importedBindings,
    );

    expect(resolveRustUsePath).toHaveBeenCalledWith(
      '/workspace/src/lib.rs',
      '/workspace',
      'crate::http::routes',
    );
    expect(relations).toEqual([
      {
        edgeType: 'import',
        sourceId: 'codegraphy.treesitter:import',
        from: { kind: 'file', filePath: '/workspace/src/lib.rs' },
        target: { kind: 'file', path: '/workspace/src/routes.rs', pathKind: 'absolute', specifier: 'crate::http::routes' },
        metadata: undefined,
        timing: undefined,
      },
    ]);
    expect(importedBindings).toEqual(new Map([
      ['routes', {
        importedName: 'routes',
        resolvedPath: '/workspace/src/routes.rs',
        specifier: 'crate::http::routes',
      }],
    ]));
  });
});
