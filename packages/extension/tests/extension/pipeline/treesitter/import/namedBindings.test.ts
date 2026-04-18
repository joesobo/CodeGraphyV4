import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addNamedImportBindings } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/namedBindings';
import { addCollectedImportBinding } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/collected';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/collected', () => ({
  addCollectedImportBinding: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  namedChildren: unknown[];
}> = {}) {
  return {
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
    );

    expect(addCollectedImportBinding).toHaveBeenNthCalledWith(
      1,
      importedBindings,
      'alias',
      'original',
      './lib',
      '/workspace/lib.ts',
    );
    expect(addCollectedImportBinding).toHaveBeenNthCalledWith(
      2,
      importedBindings,
      'Service',
      'Service',
      './lib',
      '/workspace/lib.ts',
    );
  });

  it('skips inline type-only import specifiers', () => {
    const importedBindings = new Map();

    addNamedImportBindings(
      createNode({
        type: 'named_imports',
        namedChildren: [
          createNode({
            type: 'import_specifier',
            text: 'type RuntimeOptions',
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
    );

    expect(addCollectedImportBinding).toHaveBeenCalledOnce();
    expect(addCollectedImportBinding).toHaveBeenCalledWith(
      importedBindings,
      'boot',
      'boot',
      './runtime',
      '/workspace/runtime.ts',
    );
  });

  it('skips specifiers without a local identifier', () => {
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
    );

    expect(addCollectedImportBinding).not.toHaveBeenCalled();
  });
});
