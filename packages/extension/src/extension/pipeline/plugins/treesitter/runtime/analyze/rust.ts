import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { getIdentifierText, getLastPathSegment, getNodeText } from './nodes';
import { resolveRustModuleDeclarationPath, resolveRustUsePath } from './paths';
import { addCallRelation, addImportRelation, createSymbol, normalizeAnalysisResult } from './results';
import { walkSymbolBody, walkTree } from './walk';

function getRustCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const identifier = getIdentifierText(calleeNode) ?? (
    calleeNode?.type === 'scoped_identifier'
      ? getLastPathSegment(calleeNode.text, '::')
      : null
  );

  return identifier ? importedBindings.get(identifier) ?? null : null;
}

function visitRustNode(
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
    case 'use_declaration': {
      const specifier = getNodeText(node.childForFieldName('argument'));
      if (!specifier) {
        return;
      }

      const resolvedPath = resolveRustUsePath(filePath, workspaceRoot, specifier);
      addImportRelation(relations, filePath, specifier, resolvedPath);
      importedBindings.set(getLastPathSegment(specifier, '::'), {
        importedName: getLastPathSegment(specifier, '::'),
        resolvedPath,
        specifier,
      });
      return;
    }
    case 'mod_item': {
      const moduleName = getIdentifierText(node.childForFieldName('name'));
      if (moduleName) {
        addImportRelation(
          relations,
          filePath,
          moduleName,
          resolveRustModuleDeclarationPath(filePath, moduleName),
        );
      }
      return;
    }
    case 'struct_item':
    case 'enum_item':
    case 'trait_item': {
      const name = getIdentifierText(node.childForFieldName('name'));
      if (name) {
        const kind = node.type === 'struct_item'
          ? 'struct'
          : node.type === 'enum_item'
            ? 'enum'
            : 'trait';
        symbols.push(createSymbol(filePath, kind, name, node));
      }
      return;
    }
    case 'function_item': {
      const name = getIdentifierText(node.childForFieldName('name'));
      if (!name) {
        return;
      }

      const kind = node.parent?.type === 'declaration_list' && node.parent.parent?.type === 'impl_item'
        ? 'method'
        : 'function';
      const symbol = createSymbol(filePath, kind, name, node);
      symbols.push(symbol);
      return walkSymbolBody(node, symbol.id, walk);
    }
    case 'call_expression': {
      const binding = getRustCallBinding(node, importedBindings);
      if (binding) {
        addCallRelation(relations, filePath, binding, state.currentSymbolId);
      }
      return;
    }
    default:
      return;
  }
}

export function analyzeRustFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitRustNode(
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
