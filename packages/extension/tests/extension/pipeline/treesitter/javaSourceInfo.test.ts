import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getJavaPackageName,
  resolveJavaSourceInfo,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/java/sourceInfo';

const { resolveJavaSourceRoot, getNodeText } = vi.hoisted(() => ({
  resolveJavaSourceRoot: vi.fn(),
  getNodeText: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots', () => ({
  resolveJavaSourceRoot,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getNodeText,
}));

describe('extension/pipeline/treesitter/javaSourceInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads package names from scoped and plain identifiers', () => {
    const scopedIdentifier = { type: 'scoped_identifier', text: 'com.acme' };
    const identifier = { type: 'identifier', text: 'example' };
    const annotation = { type: 'annotation', text: '@Generated' };
    getNodeText
      .mockReturnValueOnce('com.acme')
      .mockReturnValueOnce('example')
      .mockReturnValueOnce('example')
      .mockReturnValueOnce(null);

    expect(
      getJavaPackageName({
        rootNode: {
          namedChildren: [{ type: 'package_declaration', namedChildren: [scopedIdentifier] }],
        },
      } as never),
    ).toBe('com.acme');
    expect(getNodeText).toHaveBeenCalledWith(scopedIdentifier);

    expect(
      getJavaPackageName({
        rootNode: {
          namedChildren: [{ type: 'package_declaration', namedChildren: [identifier] }],
        },
      } as never),
    ).toBe('example');
    expect(
      getJavaPackageName({
        rootNode: {
          namedChildren: [{ type: 'package_declaration', namedChildren: [annotation, identifier] }],
        },
      } as never),
    ).toBe('example');
    expect(getNodeText).toHaveBeenCalledWith(identifier);

    expect(
      getJavaPackageName({
        rootNode: {
          namedChildren: [{ type: 'package_declaration', namedChildren: [{ type: 'annotation' }] }],
        },
      } as never),
    ).toBeNull();
  });

  it('returns null when no package declaration exists', () => {
    expect(
      getJavaPackageName({
        rootNode: { namedChildren: [{ type: 'class_declaration' }] },
      } as never),
    ).toBeNull();
  });

  it('resolves the source root from the detected package name', () => {
    resolveJavaSourceRoot.mockReturnValue('/workspace/src/main/java');
    getNodeText.mockReturnValue('com.acme');

    expect(
      resolveJavaSourceInfo(
        '/workspace/src/main/java/com/acme/App.java',
        {
          rootNode: {
            namedChildren: [{ type: 'package_declaration', namedChildren: [{ type: 'scoped_identifier' }] }],
          },
        } as never,
      ),
    ).toEqual({
      packageName: 'com.acme',
      sourceRoot: '/workspace/src/main/java',
    });
    expect(resolveJavaSourceRoot).toHaveBeenCalledWith(
      '/workspace/src/main/java/com/acme/App.java',
      'com.acme',
    );
  });
});
