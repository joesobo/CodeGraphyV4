import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportedBinding } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/model';
import { addNamedImportBindings } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/namedBindings';
import { addCollectedImportBinding } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/collected';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/collected', () => ({
  addCollectedImportBinding: vi.fn(),
}));

function createNode(overrides: Partial<{
  children: unknown[];
  type: string;
  text: string;
  namedChildren: unknown[];
}> = {}) {
  return {
    children: [],
    type: 'identifier',
    text: '',
    namedChildren: [],
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeImportBinding/namedBindings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('collects import specifiers from identifiers and type identifiers', () => {
    const importedBindings = new Map();
    const statementBindings: ImportedBinding[] = [];

    addNamedImportBindings(
      createNode({
        type: 'named_imports',
        namedChildren: [
          createNode({
            type: 'import_specifier',
            namedChildren: [
              createNode({ type: 'identifier', text: 'original' }),
              createNode({ type: 'identifier', text: 'alias' }),
            ],
          }),
          createNode({
            type: 'import_specifier',
            namedChildren: [createNode({ type: 'type_identifier', text: 'Service' })],
          }),
          createNode({ type: 'comment' }),
        ],
      }) as never,
      importedBindings,
      './lib',
      '/workspace/lib.ts',
      statementBindings,
    );

    expect(addCollectedImportBinding).toHaveBeenNthCalledWith(
      1,
      importedBindings,
      'alias',
      'original',
      './lib',
      '/workspace/lib.ts',
      'named',
    );
    expect(addCollectedImportBinding).toHaveBeenNthCalledWith(
      2,
      importedBindings,
      'Service',
      'Service',
      './lib',
      '/workspace/lib.ts',
      'named',
    );
  });

  it('skips inline type-only import specifiers', () => {
    const importedBindings = new Map();
    const statementBindings: ImportedBinding[] = [];

    addNamedImportBindings(
      createNode({
        type: 'named_imports',
        namedChildren: [
          createNode({
            type: 'import_specifier',
            text: 'type RuntimeOptions',
            children: [createNode({ type: 'type', text: 'type' })],
            namedChildren: [createNode({ type: 'type_identifier', text: 'RuntimeOptions' })],
          }),
          createNode({
            type: 'import_specifier',
            text: 'boot',
            namedChildren: [createNode({ type: 'identifier', text: 'boot' })],
          }),
        ],
      }) as never,
      importedBindings,
      './runtime',
      '/workspace/runtime.ts',
      statementBindings,
    );

    expect(addCollectedImportBinding).toHaveBeenCalledOnce();
    expect(addCollectedImportBinding).toHaveBeenCalledWith(
      importedBindings,
      'boot',
      'boot',
      './runtime',
      '/workspace/runtime.ts',
      'named',
    );
  });

  it('collects value imports named type', () => {
    const importedBindings = new Map();
    const statementBindings: ImportedBinding[] = [];

    addNamedImportBindings(
      createNode({
        type: 'named_imports',
        namedChildren: [
          createNode({
            type: 'import_specifier',
            text: 'type as alias',
            children: [
              createNode({ type: 'identifier', text: 'type' }),
              createNode({ type: 'as', text: 'as' }),
              createNode({ type: 'identifier', text: 'alias' }),
            ],
            namedChildren: [
              createNode({ type: 'identifier', text: 'type' }),
              createNode({ type: 'identifier', text: 'alias' }),
            ],
          }),
        ],
      }) as never,
      importedBindings,
      './runtime',
      '/workspace/runtime.ts',
      statementBindings,
    );

    expect(addCollectedImportBinding).toHaveBeenCalledOnce();
    expect(addCollectedImportBinding).toHaveBeenCalledWith(
      importedBindings,
      'alias',
      'type',
      './runtime',
      '/workspace/runtime.ts',
      'named',
    );
  });

  it('skips specifiers without a local identifier', () => {
    const statementBindings: ImportedBinding[] = [];

    addNamedImportBindings(
      createNode({
        type: 'named_imports',
        namedChildren: [
          createNode({
            type: 'import_specifier',
            namedChildren: [createNode({ type: 'string', text: '"ignored"' })],
          }),
        ],
      }) as never,
      new Map(),
      './lib',
      null,
      statementBindings,
    );

    expect(addCollectedImportBinding).not.toHaveBeenCalled();
  });
});
