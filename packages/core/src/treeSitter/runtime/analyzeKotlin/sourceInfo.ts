import type Parser from 'tree-sitter';
import { resolveKotlinSourceRoot } from '../projectRoots/kotlin';

export function getKotlinPackageName(tree: Parser.Tree): string | null {
  const packageHeader = tree.rootNode.namedChildren.find((child) => child.type === 'package_header');
  const packageName = packageHeader?.namedChildren.find((child) => child.type === 'qualified_identifier');
  return packageName?.text ?? null;
}

export function resolveKotlinSourceInfo(
  filePath: string,
  tree: Parser.Tree,
): { packageName: string | null; sourceRoot: string | null } {
  const packageName = getKotlinPackageName(tree);
  return {
    packageName,
    sourceRoot: resolveKotlinSourceRoot(filePath, packageName),
  };
}
