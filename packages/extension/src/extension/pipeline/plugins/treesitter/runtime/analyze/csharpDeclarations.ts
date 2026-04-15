import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '../../../../../../core/plugins/types/contracts';
import type { CSharpWalkState } from './csharpModel';
import type { TreeWalkAction } from './model';
import { getCSharpTypeDeclarationKind, resolveCSharpUsingImport } from './csharpResolution';
import { getIdentifierText } from './nodes';
import { addInheritRelation, createSymbol } from './results';

export function handleCSharpTypeDeclaration(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, getCSharpTypeDeclarationKind(node), name, node));
  }

  if (node.type === 'enum_declaration') {
    return;
  }

  for (const baseType of node.descendantsOfType(['identifier', 'qualified_name'])) {
    if (baseType.parent?.type !== 'base_list') {
      continue;
    }

    addInheritRelation(
      relations,
      filePath,
      baseType.text,
      resolveCSharpUsingImport(
        workspaceRoot,
        filePath,
        usingNamespaces,
        importTargetsByNamespace,
        baseType.text,
        state.currentNamespace,
      ),
    );
  }
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
