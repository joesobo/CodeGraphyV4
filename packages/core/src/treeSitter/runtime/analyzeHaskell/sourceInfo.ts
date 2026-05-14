import type Parser from 'tree-sitter';
import { resolveHaskellSourceRoot } from '../projectRoots/haskell';

export function getHaskellModuleName(tree: Parser.Tree): string | null {
  const header = tree.rootNode.namedChildren.find((child) => child.type === 'header');
  return header?.childForFieldName('module')?.text ?? null;
}

export function resolveHaskellSourceInfo(
  filePath: string,
  tree: Parser.Tree,
): { moduleName: string | null; sourceRoot: string | null } {
  const moduleName = getHaskellModuleName(tree);
  return {
    moduleName,
    sourceRoot: resolveHaskellSourceRoot(filePath, moduleName),
  };
}
