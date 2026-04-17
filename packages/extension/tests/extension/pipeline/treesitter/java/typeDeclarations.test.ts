import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleJavaTypeDeclaration } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeJava/typeDeclarations';
import { resolveJavaTypePath } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots';
import { getIdentifierText } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';
import { addInheritRelation, createSymbol } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots', () => ({
  resolveJavaTypePath: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addInheritRelation: vi.fn(),
  createSymbol: vi.fn(),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'class_declaration',
    text: '',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeJava/typeDeclarations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates symbols for class, interface, and enum declarations while skipping unnamed nodes', () => {
    const symbols: unknown[] = [];
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('App')
      .mockReturnValueOnce('Runnable')
      .mockReturnValueOnce('Status')
      .mockReturnValueOnce(null);
    vi.mocked(createSymbol).mockImplementation((_filePath: string, kind: string, name: string) => ({ kind, name }) as never);

    handleJavaTypeDeclaration(
      createNode({
        type: 'class_declaration',
        childForFieldName: (name: string) => {
          expect(['name', 'superclass']).toContain(name);
          return name === 'name' ? createNode({ type: 'identifier' }) : null;
        },
      }) as never,
      '/workspace/App.java',
      null,
      null,
      [] as never[],
      symbols as never,
      new Map(),
    );
    handleJavaTypeDeclaration(
      createNode({
        type: 'interface_declaration',
        childForFieldName: (name: string) => {
          expect(['name', 'superclass']).toContain(name);
          return name === 'name' ? createNode({ type: 'identifier' }) : null;
        },
      }) as never,
      '/workspace/App.java',
      null,
      null,
      [] as never[],
      symbols as never,
      new Map(),
    );
    handleJavaTypeDeclaration(
      createNode({
        type: 'enum_declaration',
        childForFieldName: (name: string) => {
          expect(['name', 'superclass']).toContain(name);
          return name === 'name' ? createNode({ type: 'identifier' }) : null;
        },
      }) as never,
      '/workspace/App.java',
      null,
      null,
      [] as never[],
      symbols as never,
      new Map(),
    );
    handleJavaTypeDeclaration(
      createNode({
        type: 'class_declaration',
        childForFieldName: (name: string) => {
          expect(['name', 'superclass']).toContain(name);
          return null;
        },
      }) as never,
      '/workspace/App.java',
      null,
      null,
      [] as never[],
      symbols as never,
      new Map(),
    );

    expect(symbols).toEqual([
      { kind: 'class', name: 'App' },
      { kind: 'interface', name: 'Runnable' },
      { kind: 'enum', name: 'Status' },
    ]);
  });

  it('prefers imported bindings when resolving superclass paths', () => {
    vi.mocked(getIdentifierText).mockReturnValue('App');

    handleJavaTypeDeclaration(
      createNode({
        childForFieldName: (name: string) => {
          if (name === 'name') {
            return createNode({ type: 'identifier' });
          }

          expect(name).toBe('superclass');
          return createNode({
            namedChildren: [
              createNode({ type: 'annotation', text: '@Ignored' }),
              createNode({ type: 'type_identifier', text: 'BaseApp' }),
            ],
          });
        },
      }) as never,
      '/workspace/App.java',
      '/workspace/src',
      'codegraphy.app',
      [] as never[],
      [] as never[],
      new Map([['BaseApp', { importedName: 'BaseApp', specifier: 'codegraphy.base.BaseApp', resolvedPath: '/workspace/src/codegraphy/base/BaseApp.java' }]]),
    );

    expect(addInheritRelation).toHaveBeenCalledWith(
      [],
      '/workspace/App.java',
      'BaseApp',
      '/workspace/src/codegraphy/base/BaseApp.java',
    );
    expect(resolveJavaTypePath).not.toHaveBeenCalled();
  });

  it('falls back to dotted names and package names while enums skip inheritance entirely', () => {
    vi.mocked(getIdentifierText).mockReturnValue('App');
    vi.mocked(resolveJavaTypePath)
      .mockReturnValueOnce('/workspace/src/java/util/List.java')
      .mockReturnValueOnce('/workspace/src/codegraphy/app/BaseApp.java');

    handleJavaTypeDeclaration(
      createNode({
        childForFieldName: (name: string) => {
          if (name === 'name') {
            return createNode({ type: 'identifier' });
          }

          expect(name).toBe('superclass');
          return createNode({
            namedChildren: [
              createNode({ type: 'annotation', text: '@Ignored' }),
              createNode({ type: 'type_identifier', text: 'java.util.List' }),
            ],
          });
        },
      }) as never,
      '/workspace/App.java',
      '/workspace/src',
      'codegraphy.app',
      [] as never[],
      [] as never[],
      new Map(),
    );
    handleJavaTypeDeclaration(
      createNode({
        childForFieldName: (name: string) => {
          if (name === 'name') {
            return createNode({ type: 'identifier' });
          }

          expect(name).toBe('superclass');
          return createNode({
            namedChildren: [
              createNode({ type: 'annotation', text: '@Ignored' }),
              createNode({ type: 'type_identifier', text: 'BaseApp' }),
            ],
          });
        },
      }) as never,
      '/workspace/App.java',
      '/workspace/src',
      'codegraphy.app',
      [] as never[],
      [] as never[],
      new Map(),
    );
    handleJavaTypeDeclaration(
      createNode({
        type: 'enum_declaration',
        childForFieldName: (name: string) => {
          if (name === 'name') {
            return createNode({ type: 'identifier' });
          }

          expect(name).toBe('superclass');
          return createNode({
            namedChildren: [createNode({ type: 'type_identifier', text: 'Detached' })],
          });
        },
      }) as never,
      '/workspace/App.java',
      null,
      'codegraphy.app',
      [] as never[],
      [] as never[],
      new Map(),
    );

    expect(resolveJavaTypePath).toHaveBeenNthCalledWith(1, '/workspace/src', 'java.util.List');
    expect(resolveJavaTypePath).toHaveBeenNthCalledWith(2, '/workspace/src', 'codegraphy.app.BaseApp');
    expect(addInheritRelation).toHaveBeenCalledTimes(2);
  });
});
