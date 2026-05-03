import type Parser from 'tree-sitter';
import { resolvePhpSourceRoot } from '../projectRoots/php';

export function getPhpNamespaceName(tree: Parser.Tree): string | null {
  const namespaceDefinition = tree.rootNode.namedChildren.find((child) =>
    child.type === 'namespace_definition',
  );
  return namespaceDefinition?.childForFieldName('name')?.text ?? null;
}

export function resolvePhpSourceInfo(
  filePath: string,
  tree: Parser.Tree,
): { namespaceName: string | null; sourceRoot: string | null } {
  const namespaceName = getPhpNamespaceName(tree);
  return {
    namespaceName,
    sourceRoot: resolvePhpSourceRoot(filePath, namespaceName),
  };
}
