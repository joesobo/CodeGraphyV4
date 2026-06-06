import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { CSharpWalkState } from './model';
import type { TreeWalkAction } from '../analyze/model';
import { getCSharpTypeDeclarationKind, resolveCSharpUsingType } from './resolution';
import { getIdentifierText } from '../analyze/nodes';
import { addInheritRelation, createSymbol } from '../analyze/results';

export function handleCSharpTypeDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  symbolsEnabled: boolean,
): string[] {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name && symbolsEnabled) {
    symbols.push(createSymbol(filePath, getCSharpTypeDeclarationKind(node), name, node));
  }

  if (node.type === 'enum_declaration') {
    return [];
  }

  const resolvedBaseTypePaths: string[] = [];
  for (const baseType of node.descendantsOfType(['identifier', 'qualified_name'])) {
    if (baseType.parent?.type !== 'base_list') {
      continue;
    }

    const resolvedType = resolveCSharpUsingType(
      workspaceRoot,
      filePath,
      usingNamespaces,
      importTargetsByNamespace,
      baseType.text,
      state.currentNamespace,
    );
    if (resolvedType?.kind === 'class') {
      resolvedBaseTypePaths.push(resolvedType.filePath);
    }

    addInheritRelation(
      relations,
      filePath,
      baseType.text,
      resolvedType?.filePath ?? null,
    );
  }
  return resolvedBaseTypePaths;
}

export function handleCSharpMethodDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  symbols: IAnalysisSymbol[],
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
): TreeWalkAction<CSharpWalkState> | void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (!name) {
    return;
  }

  const symbol = createSymbol(filePath, 'method', name, node);
  symbols.push(symbol);
  const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
  if (body) {
    walk(body, {
      ...state,
      currentSymbolId: symbol.id,
    });
  }

  return { skipChildren: true };
}
