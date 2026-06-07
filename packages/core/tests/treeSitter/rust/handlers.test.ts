import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleRustCallExpression,
  handleRustFunctionItem,
  handleRustModuleItem,
  handleRustNamedSymbol,
} from '../../../src/treeSitter/runtime/analyzeRust/handlers';
import { getIdentifierText } from '../../../src/treeSitter/runtime/analyze/nodes';
import { resolveRustModuleDeclarationPath } from '../../../src/treeSitter/runtime/analyzeRust/paths';
import { addCallRelation, addImportRelation, createSymbol } from '../../../src/treeSitter/runtime/analyze/results';
import { getRustCallBinding } from '../../../src/treeSitter/runtime/analyzeRust/bindings';
import { walkSymbolBody } from '../../../src/treeSitter/runtime/analyze/walk';

vi.mock('../../../src/treeSitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyzeRust/paths', () => ({
  resolveRustModuleDeclarationPath: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/results', () => ({
  addCallRelation: vi.fn(),
  addImportRelation: vi.fn(),
  createSymbol: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyzeRust/bindings', () => ({
  getRustCallBinding: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/walk', () => ({
  walkSymbolBody: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  parent: unknown;
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'function_item',
    parent: null,
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeRust/handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds module import relations only for named module items', () => {
    vi.mocked(getIdentifierText).mockReturnValueOnce('services').mockReturnValueOnce(null);
    vi.mocked(resolveRustModuleDeclarationPath).mockReturnValue('/workspace/src/services.rs');
    const importedBindings = new Map();

    handleRustModuleItem(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return createNode({ type: 'identifier' });
        },
      }) as never,
      '/workspace/src/lib.rs',
      [] as never[],
      importedBindings,
    );
    handleRustModuleItem(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return null;
        },
      }) as never,
      '/workspace/src/lib.rs',
      [] as never[],
      importedBindings,
    );

    expect(addImportRelation).toHaveBeenCalledTimes(1);
    expect(addImportRelation).toHaveBeenCalledWith(
      [],
      '/workspace/src/lib.rs',
      'services',
      '/workspace/src/services.rs',
    );
    expect(importedBindings).toEqual(new Map([
      ['services', {
        importedName: 'services',
        specifier: 'services',
        resolvedPath: '/workspace/src/services.rs',
      }],
    ]));
  });

  it('creates named Rust symbols, skips unnamed ones, and distinguishes functions from impl methods', () => {
    const symbols: Array<{ id: string }> = [];
    const symbol = { id: 'rust:run' };
    vi.mocked(createSymbol).mockReturnValue(symbol as never);
    vi.mocked(walkSymbolBody).mockReturnValue({ skipChildren: true });
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('Config')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('run')
      .mockReturnValueOnce('render')
      .mockReturnValueOnce('build');

    handleRustNamedSymbol(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return createNode({ type: 'identifier' });
        },
      }) as never,
      'struct',
      '/workspace/src/lib.rs',
      symbols as never,
    );
    handleRustNamedSymbol(
      createNode({
        childForFieldName: (name: string) => {
          expect(name).toBe('name');
          return null;
        },
      }) as never,
      'enum',
      '/workspace/src/lib.rs',
      symbols as never,
    );

    expect(
      handleRustFunctionItem(
        createNode({
          childForFieldName: (name: string) => {
            expect(name).toBe('name');
            return null;
          },
        }) as never,
        '/workspace/src/lib.rs',
        symbols as never,
        vi.fn(),
      ),
    ).toBeUndefined();
    expect(
      handleRustFunctionItem(
        createNode({
          childForFieldName: (name: string) => {
            expect(name).toBe('name');
            return createNode({ type: 'identifier' });
          },
        }) as never,
        '/workspace/src/lib.rs',
        symbols as never,
        vi.fn(),
      ),
    ).toEqual({ skipChildren: true });
    expect(
      handleRustFunctionItem(
        createNode({
          parent: {
            type: 'declaration_list',
            parent: { type: 'module_item' },
          },
          childForFieldName: (name: string) => {
            expect(name).toBe('name');
            return createNode({ type: 'identifier' });
          },
        }) as never,
        '/workspace/src/lib.rs',
        symbols as never,
        vi.fn(),
      ),
    ).toEqual({ skipChildren: true });
    expect(
      handleRustFunctionItem(
        createNode({
          parent: {
            type: 'declaration_list',
            parent: { type: 'impl_item' },
          },
          childForFieldName: (name: string) => {
            expect(name).toBe('name');
            return createNode({ type: 'identifier' });
          },
        }) as never,
        '/workspace/src/lib.rs',
        symbols as never,
        vi.fn(),
      ),
    ).toEqual({ skipChildren: true });

    expect(createSymbol).toHaveBeenNthCalledWith(1, '/workspace/src/lib.rs', 'struct', 'Config', expect.anything());
    expect(createSymbol).toHaveBeenNthCalledWith(2, '/workspace/src/lib.rs', 'function', 'run', expect.anything());
    expect(createSymbol).toHaveBeenNthCalledWith(3, '/workspace/src/lib.rs', 'function', 'render', expect.anything());
    expect(createSymbol).toHaveBeenNthCalledWith(4, '/workspace/src/lib.rs', 'method', 'build', expect.anything());
  });

  it('adds call relations only when a Rust call resolves to an imported binding', () => {
    const binding = { importedName: 'run', specifier: 'crate::run', resolvedPath: null };
    vi.mocked(getRustCallBinding).mockReturnValueOnce(binding as never).mockReturnValueOnce(null);

    handleRustCallExpression(createNode() as never, '/workspace/src/lib.rs', [] as never[], new Map(), 'symbol-id');
    handleRustCallExpression(createNode() as never, '/workspace/src/lib.rs', [] as never[], new Map(), 'symbol-id');

    expect(addCallRelation).toHaveBeenCalledTimes(1);
    expect(addCallRelation).toHaveBeenCalledWith([], '/workspace/src/lib.rs', binding, 'symbol-id');
  });
});
