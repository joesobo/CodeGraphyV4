import type Parser from 'tree-sitter';
import { resolveJavaSourceRoot } from '../projectRoots';
import { getNodeText } from './nodes';

export function getJavaPackageName(tree: Parser.Tree): string | null {
  const declarationNode = tree.rootNode.namedChildren.find((child) => child.type === 'package_declaration');
  if (!declarationNode) {
    return null;
  }

  const packageNameNode = declarationNode.namedChildren.find((child) =>
    child.type === 'scoped_identifier' || child.type === 'identifier',
  );

  return getNodeText(packageNameNode) ?? null;
}

export function resolveJavaSourceInfo(
  filePath: string,
  tree: Parser.Tree,
): { packageName: string | null; sourceRoot: string | null } {
  const packageName = getJavaPackageName(tree);
  return {
    packageName,
    sourceRoot: resolveJavaSourceRoot(filePath, packageName),
  };
}
