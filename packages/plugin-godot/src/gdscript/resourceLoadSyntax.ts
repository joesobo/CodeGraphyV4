import { isResPath } from './path';
import {
  findGDScriptSyntaxNodes,
  parseGDScriptSyntaxTree,
  readFirstDescendantText,
  readGDScriptLineNumber,
  type GDScriptSyntaxNode,
} from './syntaxTree';
import { readQuotedStringLiteral } from './stringLiteral';
import type { IGDScriptReference } from './types';

function appendStructuredReference(
  references: IGDScriptReference[],
  content: string,
  node: GDScriptSyntaxNode,
  referenceType: 'preload' | 'load',
  importType: 'static' | 'dynamic',
): void {
  const resPath = readQuotedStringLiteral(readFirstDescendantText(node, 'String'));
  if (!resPath || !isResPath(resPath)) {
    return;
  }

  references.push({
    resPath,
    referenceType,
    importType,
    line: readGDScriptLineNumber(content, node.from),
  });
}

function isSupportedLoadCall(node: GDScriptSyntaxNode): boolean {
  const callee = node.children[0].text;
  return callee === 'load' || callee === 'ResourceLoader.load';
}

export function extractStructuredGDScriptLoadReferences(content: string): IGDScriptReference[] {
  const references: IGDScriptReference[] = [];
  const tree = parseGDScriptSyntaxTree(content);

  for (const preload of findGDScriptSyntaxNodes(tree, 'PreloadExpressionNode')) {
    appendStructuredReference(references, content, preload, 'preload', 'static');
  }

  for (const call of findGDScriptSyntaxNodes(tree, 'CallExpressionNode')) {
    if (isSupportedLoadCall(call)) {
      appendStructuredReference(references, content, call, 'load', 'dynamic');
    }
  }

  return references;
}
