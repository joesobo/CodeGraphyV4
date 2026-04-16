import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TREE_SITTER_SOURCE_IDS } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/languages';
import { getImportRelationForJavaScriptCallExpression } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/javascriptCallImports';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/resolve', () => ({
  resolveTreeSitterImportPath: vi.fn(() => '/workspace/src/utils.ts'),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
  getStringSpecifier: vi.fn(),
}));

import { resolveTreeSitterImportPath } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/resolve';
import { getIdentifierText, getStringSpecifier } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';

function createCallExpression(overrides: {
  calleeNode?: unknown;
  argumentsNode?: { namedChildren: Array<{ type: string; text?: string; name?: string }> };
  namedChildren?: unknown[];
} = {}) {
  const calleeNode = overrides.calleeNode ?? { type: 'identifier' };
  const argumentsNode = overrides.argumentsNode ?? {
    namedChildren: [{ type: 'string' }],
  };

  return {
    childForFieldName: (field: string) => {
      if (field === 'function') {
        return calleeNode;
      }
      if (field === 'arguments') {
        return argumentsNode;
      }
      return null;
    },
    namedChildren: overrides.namedChildren ?? [calleeNode, argumentsNode],
  };
}

describe('pipeline/treesitter/javascriptCallImports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStringSpecifier).mockImplementation((node) => (node as { text?: string } | null)?.text ?? null);
    vi.mocked(getIdentifierText).mockImplementation((node) => (node as { name?: string } | null)?.name ?? null);
    vi.mocked(resolveTreeSitterImportPath).mockImplementation((_filePath, specifier) => {
      if (specifier === './missing') {
        return null;
      }
      return `/workspace/src/${specifier.replace('./', '')}.ts`;
    });
  });

  it('returns null when the call does not contain any arguments node or string specifier', () => {
    const callExpression = {
      childForFieldName: () => null,
      namedChildren: [{ type: 'identifier', name: 'require' }],
    };

    expect(
      getImportRelationForJavaScriptCallExpression(
        callExpression as never,
        '/workspace/src/index.ts',
      ),
    ).toBeNull();
    expect(resolveTreeSitterImportPath).not.toHaveBeenCalled();
  });

  it('builds a dynamic import relation from named-children fallbacks and interpreted string nodes', () => {
    const callExpression = {
      childForFieldName: (field: string) => {
        if (field === 'function' || field === 'arguments') {
          return null;
        }
        return null;
      },
      namedChildren: [
        { type: 'import' },
        {
          type: 'arguments',
          namedChildren: [
            { type: 'identifier', text: 'ignored' },
            { type: 'interpreted_string_literal', text: './utils' },
          ],
        },
      ],
    };

    expect(
      getImportRelationForJavaScriptCallExpression(
        callExpression as never,
        '/workspace/src/index.ts',
      ),
    ).toEqual({
      kind: 'import',
      sourceId: TREE_SITTER_SOURCE_IDS.dynamicImport,
      fromFilePath: '/workspace/src/index.ts',
      specifier: './utils',
      resolvedPath: '/workspace/src/utils.ts',
      toFilePath: '/workspace/src/utils.ts',
      type: 'dynamic',
    });
    expect(resolveTreeSitterImportPath).toHaveBeenCalledWith('/workspace/src/index.ts', './utils');
  });

  it('returns null when the callee is not require', () => {
    expect(
      getImportRelationForJavaScriptCallExpression(
        createCallExpression({
          calleeNode: { type: 'identifier', name: 'loadModule' },
          argumentsNode: {
            namedChildren: [{ type: 'string', text: './utils' }],
          },
        }) as never,
        '/workspace/src/index.ts',
      ),
    ).toBeNull();
  });

  it('builds a commonjs import relation for require calls even when the path does not resolve', () => {
    expect(
      getImportRelationForJavaScriptCallExpression(
        createCallExpression({
          calleeNode: { type: 'identifier', name: 'require' },
          argumentsNode: {
            namedChildren: [{ type: 'string', text: './missing' }],
          },
        }) as never,
        '/workspace/src/index.ts',
      ),
    ).toEqual({
      kind: 'import',
      sourceId: TREE_SITTER_SOURCE_IDS.commonjsRequire,
      fromFilePath: '/workspace/src/index.ts',
      specifier: './missing',
      resolvedPath: null,
      toFilePath: null,
      type: 'require',
    });
  });

  it('returns null without throwing when the callee fallback is missing', () => {
    const callExpression = {
      childForFieldName: (field: string) => {
        if (field === 'arguments') {
          return {
            namedChildren: [{ type: 'string', text: './utils' }],
          };
        }
        return null;
      },
      namedChildren: [],
    };

    expect(
      getImportRelationForJavaScriptCallExpression(
        callExpression as never,
        '/workspace/src/index.ts',
      ),
    ).toBeNull();
  });
});
