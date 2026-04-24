import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportedBinding } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/model';
import { applyImportClauseBinding } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/clause';
import { addCollectedImportBinding } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/collected';
import { addNamedImportBindings } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/namedBindings';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/collected', () => ({
  addCollectedImportBinding: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/namedBindings', () => ({
  addNamedImportBindings: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  namedChildren: Array<{ type: string; text?: string }>;
}> = {}) {
  return {
    type: 'identifier',
    text: 'binding',
    namedChildren: [],
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeImportBinding/clause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds default bindings for identifier clauses', () => {
    const importedBindings = new Map();
    const statementBindings: ImportedBinding[] = [];

    applyImportClauseBinding(
      createNode({ type: 'identifier', text: 'React' }) as never,
      importedBindings,
      'react',
      '/workspace/node_modules/react/index.js',
      statementBindings,
    );

    expect(addCollectedImportBinding).toHaveBeenCalledWith(
      importedBindings,
      'React',
      'default',
      'react',
      '/workspace/node_modules/react/index.js',
      'default',
    );
    expect(addNamedImportBindings).not.toHaveBeenCalled();
  });

  it('delegates named imports to the named-binding helper', () => {
    const importedBindings = new Map();
    const statementBindings: ImportedBinding[] = [];
    const node = createNode({ type: 'named_imports' });

    applyImportClauseBinding(node as never, importedBindings, './lib', null, statementBindings);

    expect(addNamedImportBindings).toHaveBeenCalledWith(
      node,
      importedBindings,
      './lib',
      null,
      statementBindings,
    );
    expect(addCollectedImportBinding).not.toHaveBeenCalled();
  });

  it('adds namespace imports from the local identifier and ignores unsupported clauses', () => {
    const importedBindings = new Map();
    const statementBindings: ImportedBinding[] = [];

    applyImportClauseBinding(
      createNode({
        type: 'namespace_import',
        namedChildren: [
          { type: 'operator', text: '*' },
          { type: 'identifier', text: 'services' },
        ],
      }) as never,
      importedBindings,
      './services',
      '/workspace/src/services.ts',
      statementBindings,
    );

    applyImportClauseBinding(
      createNode({
        type: 'namespace_import',
        namedChildren: [{ type: 'string', text: 'ignored' }],
      }) as never,
      importedBindings,
      './services',
      '/workspace/src/services.ts',
      statementBindings,
    );

    applyImportClauseBinding(
      createNode({ type: 'string' }) as never,
      importedBindings,
      './services',
      '/workspace/src/services.ts',
      statementBindings,
    );

    expect(addCollectedImportBinding).toHaveBeenCalledTimes(1);
    expect(addCollectedImportBinding).toHaveBeenCalledWith(
      importedBindings,
      'services',
      '*',
      './services',
      '/workspace/src/services.ts',
      'namespace',
    );
  });
});
