import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Parser from 'tree-sitter';
import {
  getCSharpTypeDeclarationKind,
  getCSharpTypeName,
  normalizeCSharpTypeName,
  resolveCSharpUsingImport,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/resolution';
import {
  resolveCSharpTypePath,
  resolveCSharpTypePathInNamespace,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';
import { getIdentifierText, getNodeText } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex', () => ({
  resolveCSharpTypePath: vi.fn(),
  resolveCSharpTypePathInNamespace: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
  getNodeText: vi.fn(),
}));

function createNode({
  type = 'identifier',
  text = '',
}: {
  type?: string;
  text?: string;
} = {}): Parser.SyntaxNode {
  return {
    type,
    text,
  } as unknown as Parser.SyntaxNode;
}

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp/resolution', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('normalizes nullable, generic, and qualified C# type names', () => {
    expect(normalizeCSharpTypeName('User?')).toBe('User');
    expect(normalizeCSharpTypeName('System.Collections.Generic.List<User>')).toBe('List');
    expect(normalizeCSharpTypeName('CodeGraphy.Models.User')).toBe('User');
    expect(normalizeCSharpTypeName('')).toBe('');
  });

  it('prefers node text helpers before falling back to the raw node text', () => {
    vi.mocked(getNodeText).mockReturnValueOnce('CodeGraphy.Models.User');
    expect(getCSharpTypeName(createNode({ text: 'RawUser' }))).toBe('User');

    vi.mocked(getNodeText).mockReturnValueOnce(null);
    vi.mocked(getIdentifierText).mockReturnValueOnce('CodeGraphy.Services.Worker');
    expect(getCSharpTypeName(createNode({ text: 'RawWorker' }))).toBe('Worker');

    vi.mocked(getNodeText).mockReturnValueOnce(null);
    vi.mocked(getIdentifierText).mockReturnValueOnce(null);
    expect(getCSharpTypeName(createNode({ text: 'RawType?' }))).toBe('RawType');
  });

  it('returns null when no usable text is available for a type node', () => {
    vi.mocked(getNodeText).mockReturnValue(null);
    vi.mocked(getIdentifierText).mockReturnValue(null);

    expect(getCSharpTypeName(createNode())).toBeNull();
    expect(getCSharpTypeName(null)).toBeNull();
    expect(getCSharpTypeName(undefined)).toBeNull();
  });

  it('resolves using imports in matching namespaces and records the resolved path', () => {
    vi.mocked(resolveCSharpTypePathInNamespace).mockImplementation(
      (_workspaceRoot, _filePath, namespaceName) =>
        namespaceName === 'CodeGraphy.Models' ? '/workspace/src/Models/User.cs' : null,
    );

    const importTargetsByNamespace = new Map<string, Set<string>>([
      ['CodeGraphy.Models', new Set(['/workspace/src/Models/Existing.cs'])],
    ]);

    expect(
      resolveCSharpUsingImport(
        '/workspace',
        '/workspace/src/App.cs',
        new Set(['CodeGraphy.Models', 'CodeGraphy.Services']),
        importTargetsByNamespace,
        'CodeGraphy.Models.User?',
        'CodeGraphy.App',
      ),
    ).toBe('/workspace/src/Models/User.cs');

    expect(resolveCSharpTypePathInNamespace).toHaveBeenCalledWith(
      '/workspace',
      '/workspace/src/App.cs',
      'CodeGraphy.Models',
      'User',
    );
    expect(resolveCSharpTypePath).not.toHaveBeenCalled();
    expect(importTargetsByNamespace.get('CodeGraphy.Models')).toEqual(
      new Set([
        '/workspace/src/Models/Existing.cs',
        '/workspace/src/Models/User.cs',
      ]),
    );
  });

  it('falls back to project-wide C# resolution when no using namespace matches', () => {
    vi.mocked(resolveCSharpTypePathInNamespace).mockReturnValue(null);
    vi.mocked(resolveCSharpTypePath).mockReturnValue('/workspace/src/Services/Worker.cs');

    const importTargetsByNamespace = new Map<string, Set<string>>();

    expect(
      resolveCSharpUsingImport(
        '/workspace',
        '/workspace/src/App.cs',
        new Set(['CodeGraphy.Models', 'CodeGraphy.Services']),
        importTargetsByNamespace,
        'CodeGraphy.Services.Worker<T>',
        'CodeGraphy.App',
      ),
    ).toBe('/workspace/src/Services/Worker.cs');

    expect(resolveCSharpTypePath).toHaveBeenCalledWith(
      '/workspace',
      '/workspace/src/App.cs',
      'Worker',
      'CodeGraphy.App',
      ['CodeGraphy.Models', 'CodeGraphy.Services'],
    );
    expect(importTargetsByNamespace.size).toBe(0);
  });

  it('classifies C# type declaration kinds by syntax node type', () => {
    expect(getCSharpTypeDeclarationKind(createNode({ type: 'interface_declaration' }))).toBe('interface');
    expect(getCSharpTypeDeclarationKind(createNode({ type: 'struct_declaration' }))).toBe('struct');
    expect(getCSharpTypeDeclarationKind(createNode({ type: 'enum_declaration' }))).toBe('enum');
    expect(getCSharpTypeDeclarationKind(createNode({ type: 'class_declaration' }))).toBe('class');
  });
});
