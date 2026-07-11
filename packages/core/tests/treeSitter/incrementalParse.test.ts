import type Parser from 'tree-sitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTreeSitterTreeCache,
  parseTreeSitterFile,
} from '../../src/treeSitter/runtime/incrementalParse';
import { createTreeSitterRuntime } from '../../src/treeSitter/runtime/languages/parser';

function createTree() {
  return { edit: vi.fn() } as unknown as Parser.Tree;
}

describe('pipeline/plugins/treesitter/runtime/incrementalParse', () => {
  beforeEach(() => {
    clearTreeSitterTreeCache();
  });

  it('uses the retained edited tree when the same file changes', () => {
    const firstTree = createTree();
    const secondTree = createTree();
    const parser = {
      parse: vi.fn()
        .mockReturnValueOnce(firstTree)
        .mockReturnValueOnce(secondTree),
    } as unknown as Parser;

    expect(parseTreeSitterFile(parser, '/workspace/app.ts', 'const a = 1;\n', 'typescript'))
      .toBe(firstTree);
    expect(parseTreeSitterFile(parser, '/workspace/app.ts', 'const a = 2;\n', 'typescript'))
      .toBe(secondTree);

    expect(firstTree.edit).toHaveBeenCalledWith({
      startIndex: 10,
      oldEndIndex: 11,
      newEndIndex: 11,
      startPosition: { row: 0, column: 10 },
      oldEndPosition: { row: 0, column: 11 },
      newEndPosition: { row: 0, column: 11 },
    });
    expect(parser.parse).toHaveBeenNthCalledWith(2, 'const a = 2;\n', firstTree);
  });

  it('computes byte-based edit positions for multiline unicode content', () => {
    const firstTree = createTree();
    const parser = {
      parse: vi.fn()
        .mockReturnValueOnce(firstTree)
        .mockReturnValueOnce(createTree()),
    } as unknown as Parser;

    parseTreeSitterFile(parser, '/workspace/app.ts', 'const icon = "🧭";\nold();\n', 'typescript');
    parseTreeSitterFile(parser, '/workspace/app.ts', 'const icon = "🧭";\nnewCall();\n', 'typescript');

    expect(firstTree.edit).toHaveBeenCalledWith({
      startIndex: 21,
      oldEndIndex: 24,
      newEndIndex: 28,
      startPosition: { row: 1, column: 0 },
      oldEndPosition: { row: 1, column: 3 },
      newEndPosition: { row: 1, column: 7 },
    });
  });

  it('does not split a surrogate pair at a shared low surrogate', () => {
    const firstTree = createTree();
    const parser = {
      parse: vi.fn()
        .mockReturnValueOnce(firstTree)
        .mockReturnValueOnce(createTree()),
    } as unknown as Parser;
    const previousSymbol = String.fromCodePoint(0x10000);
    const nextSymbol = String.fromCodePoint(0x10400);

    parseTreeSitterFile(parser, '/workspace/app.ts', `a${previousSymbol}z`, 'typescript');
    parseTreeSitterFile(parser, '/workspace/app.ts', `a${nextSymbol}z`, 'typescript');

    expect(firstTree.edit).toHaveBeenCalledWith({
      startIndex: 1,
      oldEndIndex: 5,
      newEndIndex: 5,
      startPosition: { row: 0, column: 1 },
      oldEndPosition: { row: 0, column: 5 },
      newEndPosition: { row: 0, column: 5 },
    });
  });

  it('returns the retained tree without parsing unchanged content again', () => {
    const tree = createTree();
    const parser = { parse: vi.fn().mockReturnValue(tree) } as unknown as Parser;

    parseTreeSitterFile(parser, '/workspace/app.ts', 'const ready = true;\n', 'typescript');
    expect(parseTreeSitterFile(
      parser,
      '/workspace/app.ts',
      'const ready = true;\n',
      'typescript',
    )).toBe(tree);

    expect(parser.parse).toHaveBeenCalledTimes(1);
    expect(tree.edit).not.toHaveBeenCalled();
  });

  it('does not reuse a tree after the file language changes', () => {
    const firstTree = createTree();
    const parser = {
      parse: vi.fn()
        .mockReturnValueOnce(firstTree)
        .mockReturnValueOnce(createTree()),
    } as unknown as Parser;

    parseTreeSitterFile(parser, '/workspace/header.h', 'int ready;\n', 'c');
    parseTreeSitterFile(parser, '/workspace/header.h', '@interface Ready\n@end\n', 'objectiveC');

    expect(firstTree.edit).not.toHaveBeenCalled();
    expect(parser.parse).toHaveBeenNthCalledWith(2, '@interface Ready\n@end\n');
  });

  it('updates a native syntax tree from retained content', async () => {
    const runtime = await createTreeSitterRuntime('/workspace/app.ts');
    expect(runtime).not.toBeNull();
    if (!runtime) {
      return;
    }

    parseTreeSitterFile(
      runtime.parser,
      '/workspace/app.ts',
      'export const state = "before";\n',
      runtime.languageKind,
    );
    const updatedTree = parseTreeSitterFile(
      runtime.parser,
      '/workspace/app.ts',
      'export const state = "after";\n',
      runtime.languageKind,
    );

    expect(updatedTree.rootNode.text).toBe('export const state = "after";\n');
    expect(updatedTree.rootNode.hasError).toBe(false);
  });
});
