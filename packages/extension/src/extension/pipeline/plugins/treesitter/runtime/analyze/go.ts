import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { resolveGoPackagePath } from '../projectRoots';
import { resolveTreeSitterImportPath } from '../resolve';
import { getImportedBindingByIdentifier, getImportedBindingByPropertyAccess } from './imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { getIdentifierText, getLastPathSegment, getStringSpecifier } from './nodes';
import { addCallRelation, addImportRelation, createSymbol, normalizeAnalysisResult } from './results';
import { walkSymbolBody, walkTree } from './walk';

function getGoCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return (
    getImportedBindingByIdentifier(calleeNode, importedBindings)
    ?? getImportedBindingByPropertyAccess(calleeNode, importedBindings, 'selector_expression', 'operand')
  );
}

function getGoImportLocalName(importSpec: Parser.SyntaxNode, specifier: string): string {
  const aliasName = getIdentifierText(importSpec.childForFieldName('name'));
  if (aliasName) {
    return aliasName;
  }

  return getLastPathSegment(specifier, '/');
}

function getGoTypeKind(node: Parser.SyntaxNode): 'interface' | 'struct' | 'type' {
  const typeNode = node.childForFieldName('type') ?? node.namedChildren.at(-1);
  if (typeNode?.type === 'interface_type') {
    return 'interface';
  }

  if (typeNode?.type === 'struct_type') {
    return 'struct';
  }

  return 'type';
}

function visitGoNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_declaration': {
      const importSpecs = node.descendantsOfType('import_spec');
      for (const importSpec of importSpecs) {
        const specifier = getStringSpecifier(importSpec.childForFieldName('path'));
        if (!specifier) {
          continue;
        }

        const resolvedPath = specifier.startsWith('.')
          ? resolveTreeSitterImportPath(filePath, specifier)
          : resolveGoPackagePath(filePath, workspaceRoot, specifier);
        addImportRelation(relations, filePath, specifier, resolvedPath);
        importedBindings.set(getGoImportLocalName(importSpec, specifier), {
          importedName: specifier,
          resolvedPath,
          specifier,
        });
      }
      return { skipChildren: true };
    }
    case 'function_declaration':
    case 'method_declaration': {
      const name = getIdentifierText(node.childForFieldName('name'));
      if (!name) {
        return;
      }

      const kind = node.type === 'method_declaration' ? 'method' : 'function';
      const symbol = createSymbol(filePath, kind, name, node);
      symbols.push(symbol);
      return walkSymbolBody(node, symbol.id, walk);
    }
    case 'type_spec': {
      const name = getIdentifierText(node.childForFieldName('name'));
      if (name) {
        symbols.push(createSymbol(filePath, getGoTypeKind(node), name, node));
      }
      return;
    }
    case 'call_expression': {
      const binding = getGoCallBinding(node, importedBindings);
      if (binding) {
        addCallRelation(relations, filePath, binding, state.currentSymbolId);
      }
      return;
    }
    default:
      return;
  }
}

export function analyzeGoFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitGoNode(
      node,
      state,
      walk,
      filePath,
      workspaceRoot,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
