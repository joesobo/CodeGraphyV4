import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { getImportedBindingByIdentifier, getImportedBindingByPropertyAccess } from './imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { getIdentifierText, getLastPathSegment, getNodeText, joinModuleSpecifier } from './nodes';
import { resolvePythonModulePath } from './paths';
import { addCallRelation, addImportRelation, createSymbol, normalizeAnalysisResult } from './results';
import { walkSymbolBody, walkTree } from './walk';

function getPythonCallBinding(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  return (
    getImportedBindingByIdentifier(calleeNode, importedBindings)
    ?? getImportedBindingByPropertyAccess(calleeNode, importedBindings, 'attribute', 'object')
  );
}

function getPythonImportFromModuleNode(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
  return node.namedChildren.find((child) =>
    child.type === 'relative_import' || child.type === 'dotted_name',
  );
}

function getPythonImportFromImportedNodes(
  node: Parser.SyntaxNode,
  moduleNode: Parser.SyntaxNode | undefined,
): Parser.SyntaxNode[] {
  return node.namedChildren.filter((child) =>
    (child.type === 'dotted_name' || child.type === 'aliased_import') && child !== moduleNode,
  );
}

function getPythonImportedName(node: Parser.SyntaxNode): string | null {
  return node.type === 'aliased_import'
    ? getNodeText(node.childForFieldName('name') ?? node.namedChildren[0])
    : getNodeText(node);
}

function resolvePythonImportFromPath(
  filePath: string,
  workspaceRoot: string,
  moduleSpecifier: string,
  specifier: string,
): string | null {
  return resolvePythonModulePath(filePath, workspaceRoot, specifier)
    ?? (moduleSpecifier
      ? resolvePythonModulePath(filePath, workspaceRoot, moduleSpecifier)
      : null);
}

function visitPythonNode(
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
    case 'import_statement': {
      const moduleNodes = node.namedChildren.filter((child) =>
        child.type === 'dotted_name' || child.type === 'aliased_import',
      );
      for (const moduleNode of moduleNodes) {
        const specifier = moduleNode.type === 'aliased_import'
          ? getNodeText(moduleNode.childForFieldName('name') ?? moduleNode.namedChildren[0])
          : getNodeText(moduleNode);
        const aliasName = getIdentifierText(moduleNode.childForFieldName('alias'));
        if (!specifier) {
          continue;
        }

        const resolvedPath = resolvePythonModulePath(filePath, workspaceRoot, specifier);
        addImportRelation(relations, filePath, specifier, resolvedPath);
        importedBindings.set(aliasName ?? getLastPathSegment(specifier, '.'), {
          importedName: specifier,
          resolvedPath,
          specifier,
        });
      }
      return { skipChildren: true };
    }
    case 'import_from_statement': {
      const moduleNode = getPythonImportFromModuleNode(node);
      const moduleSpecifier = getNodeText(moduleNode) ?? '';
      const importedNodes = getPythonImportFromImportedNodes(node, moduleNode);
      if (importedNodes.length === 0) {
        if (moduleSpecifier) {
          addImportRelation(
            relations,
            filePath,
            moduleSpecifier,
            resolvePythonModulePath(filePath, workspaceRoot, moduleSpecifier),
          );
        }
        return { skipChildren: true };
      }

      for (const importedNode of importedNodes) {
        const importedName = getPythonImportedName(importedNode);
        if (!importedName) {
          continue;
        }

        const localName = getIdentifierText(importedNode.childForFieldName('alias'))
          ?? getLastPathSegment(importedName, '.');
        const specifier = joinModuleSpecifier(moduleSpecifier, importedName);
        const resolvedPath = resolvePythonImportFromPath(
          filePath,
          workspaceRoot,
          moduleSpecifier,
          specifier,
        );

        addImportRelation(relations, filePath, specifier, resolvedPath);
        importedBindings.set(localName, {
          importedName,
          resolvedPath,
          specifier,
        });
      }
      return { skipChildren: true };
    }
    case 'class_definition': {
      const name = getIdentifierText(node.childForFieldName('name'));
      if (name) {
        symbols.push(createSymbol(filePath, 'class', name, node));
      }
      return;
    }
    case 'function_definition': {
      const name = getIdentifierText(node.childForFieldName('name'));
      if (!name) {
        return;
      }

      const kind = node.parent?.type === 'block' && node.parent.parent?.type === 'class_definition'
        ? 'method'
        : 'function';
      const symbol = createSymbol(filePath, kind, name, node);
      symbols.push(symbol);
      return walkSymbolBody(node, symbol.id, walk);
    }
    case 'call': {
      const binding = getPythonCallBinding(node, importedBindings);
      if (binding) {
        addCallRelation(relations, filePath, binding, state.currentSymbolId);
      }
      return;
    }
    default:
      return;
  }
}

export function analyzePythonFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitPythonNode(
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
