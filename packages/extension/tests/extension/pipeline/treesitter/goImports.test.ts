import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleGoImportDeclaration } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/go/imports';
import { resolveGoPackagePath } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots';
import { resolveTreeSitterImportPath } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/resolve';
import {
  getIdentifierText,
  getLastPathSegment,
  getStringSpecifier,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';
import { addImportRelation } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots', () => ({
  resolveGoPackagePath: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/resolve', () => ({
  resolveTreeSitterImportPath: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
  getLastPathSegment: vi.fn((value: string, separator: string) => value.split(separator).at(-1) ?? null),
  getStringSpecifier: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addImportRelation: vi.fn(),
}));

function createNode(
  overrides: Partial<{
    childForFieldName: (name: string) => unknown;
    descendantsOfType: (type: string) => unknown[];
  }> = {},
) {
  return {
    childForFieldName: () => null,
    descendantsOfType: () => [],
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/go/imports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves absolute and relative imports and stores bindings by alias or package name', () => {
    const relativePathNode = { type: 'interpreted_string_literal', text: '"./internal/helper"' };
    const absolutePathNode = { type: 'interpreted_string_literal', text: '"github.com/acme/widget"' };
    const missingPathNode = { type: 'interpreted_string_literal', text: '""' };
    const relativeImport = createNode({
      childForFieldName: (name: string) => {
        expect(['path', 'name']).toContain(name);
        return name === 'path' ? relativePathNode : null;
      },
    });
    const absoluteImport = createNode({
      childForFieldName: (name: string) => {
        expect(['path', 'name']).toContain(name);
        return name === 'path' ? absolutePathNode : name === 'name' ? { type: 'identifier', text: 'widget' } : null;
      },
    });
    const missingImport = createNode({
      childForFieldName: (name: string) => {
        expect(['path', 'name']).toContain(name);
        return name === 'path' ? missingPathNode : null;
      },
    });
    vi.mocked(getStringSpecifier)
      .mockReturnValueOnce('./internal/helper')
      .mockReturnValueOnce('github.com/acme/widget')
      .mockReturnValueOnce(null);
    vi.mocked(getIdentifierText).mockReturnValueOnce(null).mockReturnValueOnce('widget');
    vi.mocked(resolveTreeSitterImportPath).mockReturnValue('/workspace/internal/helper.go');
    vi.mocked(resolveGoPackagePath).mockReturnValue('/workspace/pkg/mod/github.com/acme/widget');

    const relations: never[] = [];
    const importedBindings = new Map();

    expect(
      handleGoImportDeclaration(
        createNode({
          descendantsOfType: (type: string) => {
            expect(type).toBe('import_spec');
            return [relativeImport, absoluteImport, missingImport];
          },
        }) as never,
        '/workspace/cmd/app/main.go',
        '/workspace',
        relations,
        importedBindings as never,
      ),
    ).toEqual({ skipChildren: true });
    expect(resolveTreeSitterImportPath).toHaveBeenCalledWith('/workspace/cmd/app/main.go', './internal/helper');
    expect(resolveGoPackagePath).toHaveBeenCalledWith(
      '/workspace/cmd/app/main.go',
      '/workspace',
      'github.com/acme/widget',
    );
    expect(addImportRelation).toHaveBeenNthCalledWith(
      1,
      relations,
      '/workspace/cmd/app/main.go',
      './internal/helper',
      '/workspace/internal/helper.go',
    );
    expect(addImportRelation).toHaveBeenNthCalledWith(
      2,
      relations,
      '/workspace/cmd/app/main.go',
      'github.com/acme/widget',
      '/workspace/pkg/mod/github.com/acme/widget',
    );
    expect(importedBindings.get('helper')).toEqual({
      importedName: './internal/helper',
      resolvedPath: '/workspace/internal/helper.go',
      specifier: './internal/helper',
    });
    expect(importedBindings.get('widget')).toEqual({
      importedName: 'github.com/acme/widget',
      resolvedPath: '/workspace/pkg/mod/github.com/acme/widget',
      specifier: 'github.com/acme/widget',
    });
    expect(getLastPathSegment).toHaveBeenCalledWith('./internal/helper', '/');
  });

  it('prefers an explicit alias name over the package basename', () => {
    const aliasImport = createNode({
      childForFieldName: (name: string) => {
        expect(['path', 'name']).toContain(name);
        return name === 'path'
          ? { type: 'interpreted_string_literal', text: '"github.com/acme/widget"' }
          : { type: 'identifier', text: 'aliasWidget' };
      },
    });
    vi.mocked(getStringSpecifier).mockReturnValue('github.com/acme/widget');
    vi.mocked(getIdentifierText).mockReturnValue('aliasWidget');
    vi.mocked(resolveGoPackagePath).mockReturnValue('/workspace/pkg/mod/github.com/acme/widget');

    const importedBindings = new Map();

    handleGoImportDeclaration(
      createNode({
        descendantsOfType: (type: string) => {
          expect(type).toBe('import_spec');
          return [aliasImport];
        },
      }) as never,
      '/workspace/cmd/app/main.go',
      '/workspace',
      [] as never[],
      importedBindings as never,
    );

    expect(importedBindings.get('aliasWidget')).toEqual({
      importedName: 'github.com/acme/widget',
      resolvedPath: '/workspace/pkg/mod/github.com/acme/widget',
      specifier: 'github.com/acme/widget',
    });
    expect(getLastPathSegment).not.toHaveBeenCalled();
  });
});
