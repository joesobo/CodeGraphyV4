import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { resolveCSharpTypePath, resolveCSharpTypePathInNamespace } from '../csharpIndex';
import type { TreeWalkAction } from './model';
import { getIdentifierText, getNodeText } from './nodes';
import { addImportRelation, addInheritRelation, addReferenceRelation, createSymbol, normalizeAnalysisResult } from './results';
import { walkTree } from './walk';

interface CSharpWalkState {
  currentNamespace: string | null;
  currentSymbolId?: string;
}

const C_SHARP_NAMESPACE_NAME_TYPES = new Set([
  'identifier',
  'qualified_name',
  'alias_qualified_name',
]);

function normalizeCSharpTypeName(typeName: string): string {
  return typeName
    .replace(/\?.*$/u, '')
    .replace(/<.*$/u, '')
    .split('.')
    .filter(Boolean)
    .at(-1)
    ?? typeName;
}

function getCSharpTypeName(node: Parser.SyntaxNode | null | undefined): string | null {
  const text = getNodeText(node) ?? getIdentifierText(node) ?? node?.text ?? null;
  return text ? normalizeCSharpTypeName(text) : null;
}

function getCSharpNamespaceName(node: Parser.SyntaxNode): string | null {
  const nameNode = node.childForFieldName('name');
  if (nameNode) {
    return getNodeText(nameNode);
  }

  return getNodeText(
    node.namedChildren.find((child) => C_SHARP_NAMESPACE_NAME_TYPES.has(child.type)),
  );
}

function getCSharpFileScopedNamespaceName(rootNode: Parser.SyntaxNode): string | null {
  const declaration = rootNode.namedChildren.find(
    (child) => child.type === 'file_scoped_namespace_declaration',
  );
  return declaration ? getCSharpNamespaceName(declaration) : null;
}

function resolveCSharpUsingImport(
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  typeName: string,
  currentNamespace: string | null,
): string | null {
  const normalizedTypeName = normalizeCSharpTypeName(typeName);
  for (const namespaceName of usingNamespaces) {
    const resolvedPath = resolveCSharpTypePathInNamespace(
      workspaceRoot,
      filePath,
      namespaceName,
      normalizedTypeName,
    );
    if (!resolvedPath) {
      continue;
    }

    const paths = importTargetsByNamespace.get(namespaceName) ?? new Set<string>();
    paths.add(resolvedPath);
    importTargetsByNamespace.set(namespaceName, paths);
    return resolvedPath;
  }

  return resolveCSharpTypePath(
    workspaceRoot,
    filePath,
    normalizedTypeName,
    currentNamespace,
    [...usingNamespaces],
  );
}

function getCSharpTypeDeclarationKind(
  node: Parser.SyntaxNode,
): 'interface' | 'struct' | 'enum' | 'class' {
  if (node.type === 'interface_declaration') {
    return 'interface';
  }

  if (node.type === 'struct_declaration') {
    return 'struct';
  }

  if (node.type === 'enum_declaration') {
    return 'enum';
  }

  return 'class';
}

function visitCSharpNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
  filePath: string,
  workspaceRoot: string,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  usingNamespaces: Set<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): TreeWalkAction<CSharpWalkState> | void {
  if (node.type === 'namespace_declaration' || node.type === 'file_scoped_namespace_declaration') {
    if (node.type === 'file_scoped_namespace_declaration') {
      return { skipChildren: true };
    }

    const namespaceName = getCSharpNamespaceName(node) ?? state.currentNamespace;
    for (const child of node.namedChildren) {
      walk(child, {
        ...state,
        currentNamespace: namespaceName,
      });
    }

    return { skipChildren: true };
  }

  if (node.type === 'using_directive') {
    const specifier = getNodeText(node.namedChildren[0]);
    if (specifier) {
      usingNamespaces.add(specifier);
    }
    return;
  }

  if (
    node.type === 'class_declaration'
    || node.type === 'interface_declaration'
    || node.type === 'struct_declaration'
    || node.type === 'enum_declaration'
  ) {
    const name = getIdentifierText(node.childForFieldName('name'));
    if (name) {
      symbols.push(createSymbol(filePath, getCSharpTypeDeclarationKind(node), name, node));
    }

    if (node.type !== 'enum_declaration') {
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
    return;
  }

  if (node.type === 'method_declaration') {
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

  if (node.type !== 'member_access_expression' && node.type !== 'object_creation_expression') {
    return;
  }

  const typeName = node.type === 'member_access_expression'
    ? getIdentifierText(node.childForFieldName('expression') ?? node.namedChildren[0])
    : getCSharpTypeName(node.childForFieldName('type'));
  if (!typeName || !/^[A-Z]/u.test(typeName)) {
    return;
  }

  const resolvedPath = resolveCSharpUsingImport(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    typeName,
    state.currentNamespace,
  );
  if (resolvedPath) {
    addReferenceRelation(
      relations,
      filePath,
      typeName,
      resolvedPath,
      state.currentSymbolId,
    );
  }
}

function appendCSharpUsingImportRelations(
  workspaceRoot: string,
  filePath: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: ReadonlyMap<string, Set<string>>,
): void {
  for (const relation of relations) {
    if (
      (relation.kind !== 'reference' && relation.kind !== 'inherit')
      || !relation.resolvedPath
      || !relation.specifier
    ) {
      continue;
    }

    for (const namespaceName of usingNamespaces) {
      const expectedPath = resolveCSharpTypePathInNamespace(
        workspaceRoot,
        filePath,
        namespaceName,
        normalizeCSharpTypeName(relation.specifier),
      );
      if (expectedPath === relation.resolvedPath) {
        const paths = importTargetsByNamespace.get(namespaceName) ?? new Set<string>();
        paths.add(relation.resolvedPath);
        (importTargetsByNamespace as Map<string, Set<string>>).set(namespaceName, paths);
      }
    }
  }

  for (const namespaceName of usingNamespaces) {
    const targetPaths = importTargetsByNamespace.get(namespaceName);
    if (!targetPaths || targetPaths.size === 0) {
      addImportRelation(relations, filePath, namespaceName, null);
      continue;
    }

    for (const targetPath of targetPaths) {
      addImportRelation(relations, filePath, namespaceName, targetPath);
    }
  }
}

export function analyzeCSharpFile(
  filePath: string,
  tree: Parser.Tree,
  workspaceRoot: string,
): IFileAnalysisResult {
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const usingNamespaces = new Set<string>();
  const importTargetsByNamespace = new Map<string, Set<string>>();
  walkTree(
    tree.rootNode,
    { currentNamespace: getCSharpFileScopedNamespaceName(tree.rootNode) },
    (node, state, walk) =>
      visitCSharpNode(
        node,
        state,
        walk,
        filePath,
        workspaceRoot,
        relations,
        symbols,
        usingNamespaces,
        importTargetsByNamespace,
      ),
  );

  appendCSharpUsingImportRelations(
    workspaceRoot,
    filePath,
    relations,
    usingNamespaces,
    importTargetsByNamespace,
  );

  return normalizeAnalysisResult(filePath, symbols, relations);
}
