import type Parser from 'tree-sitter';
import type { TreeSitterLanguageKind } from './languages/catalog';

interface RetainedTree {
  content: string;
  languageKind: TreeSitterLanguageKind;
  tree: Parser.Tree;
}

const retainedTreeByFilePath = new Map<string, RetainedTree>();

function isHighSurrogate(code: number): boolean {
  return code >= 0xD800 && code <= 0xDBFF;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xDC00 && code <= 0xDFFF;
}

function alignBeforeSurrogatePair(content: string, index: number): number {
  if (
    index > 0
    && index < content.length
    && isHighSurrogate(content.charCodeAt(index - 1))
    && isLowSurrogate(content.charCodeAt(index))
  ) {
    return index - 1;
  }
  return index;
}

function findCommonPrefixLength(previous: string, next: string): number {
  const limit = Math.min(previous.length, next.length);
  let index = 0;
  while (index < limit && previous[index] === next[index]) {
    index += 1;
  }
  return alignBeforeSurrogatePair(previous, index);
}

function findCommonSuffixLength(previous: string, next: string, prefixLength: number): number {
  const limit = Math.min(previous.length, next.length) - prefixLength;
  let length = 0;
  while (
    length < limit
    && previous[previous.length - length - 1] === next[next.length - length - 1]
  ) {
    length += 1;
  }

  const previousStart = previous.length - length;
  return length > 0 && isLowSurrogate(previous.charCodeAt(previousStart))
    ? length - 1
    : length;
}

function positionAt(content: string, index: number): Parser.Point {
  const prefix = content.slice(0, index);
  const lastLineBreak = prefix.lastIndexOf('\n');
  let row = 0;
  for (let cursor = 0; cursor < prefix.length; cursor += 1) {
    if (prefix[cursor] === '\n') {
      row += 1;
    }
  }
  return {
    row,
    column: Buffer.byteLength(prefix.slice(lastLineBreak + 1)),
  };
}

function createEdit(previous: string, next: string): Parser.Edit {
  const prefixLength = findCommonPrefixLength(previous, next);
  const suffixLength = findCommonSuffixLength(previous, next, prefixLength);
  const previousEnd = previous.length - suffixLength;
  const nextEnd = next.length - suffixLength;

  return {
    startIndex: Buffer.byteLength(previous.slice(0, prefixLength)),
    oldEndIndex: Buffer.byteLength(previous.slice(0, previousEnd)),
    newEndIndex: Buffer.byteLength(next.slice(0, nextEnd)),
    startPosition: positionAt(previous, prefixLength),
    oldEndPosition: positionAt(previous, previousEnd),
    newEndPosition: positionAt(next, nextEnd),
  };
}

export function clearTreeSitterTreeCache(): void {
  retainedTreeByFilePath.clear();
}

export function parseTreeSitterFile(
  parser: Parser,
  filePath: string,
  content: string,
  languageKind: TreeSitterLanguageKind,
): Parser.Tree {
  const retained = retainedTreeByFilePath.get(filePath);
  if (retained?.languageKind === languageKind && retained.content === content) {
    return retained.tree;
  }

  let tree: Parser.Tree;
  if (retained?.languageKind === languageKind) {
    retained.tree.edit(createEdit(retained.content, content));
    tree = parser.parse(content, retained.tree);
  } else {
    tree = parser.parse(content);
  }

  retainedTreeByFilePath.set(filePath, { content, languageKind, tree });
  return tree;
}
