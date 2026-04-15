import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { resolveJavaSourceRoot, resolveJavaTypePath } from '../projectRoots';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from './model';
import { getIdentifierText, getLastPathSegment, getNodeText } from './nodes';
import { addCallRelation, addImportRelation, addInheritRelation, createSymbol, normalizeAnalysisResult } from './results';
import { walkSymbolBody, walkTree } from './walk';

function getJavaPackageName(tree: Parser.Tree): string | null {
  const declarationNode = tree.rootNode.namedChildren.find((child) => child.type === 'package_declaration');
  if (!declarationNode) {
    return null;
  }

  const packageNameNode = declarationNode.namedChildren.find((child) =>
    child.type === 'scoped_identifier' || child.type === 'identifier',
  );

  return getNodeText(packageNameNode) ?? null;
}

function resolveJavaReferencePath(
  sourceRoot: string | null,
  packageName: string | null,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  typeName: string,
): string | null {
  if (!sourceRoot) {
    return null;
  }

  const importedBinding = importedBindings.get(typeName);
  if (importedBinding?.resolvedPath) {
    return importedBinding.resolvedPath;
  }

  if (typeName.includes('.')) {
    return resolveJavaTypePath(sourceRoot, typeName);
  }

  return packageName
    ? resolveJavaTypePath(sourceRoot, `${packageName}.${typeName}`)
    : null;
}

function getJavaTypeDeclarationKind(node: Parser.SyntaxNode): 'interface' | 'enum' | 'class' {
  if (node.type === 'interface_declaration') {
    return 'interface';
  }

  if (node.type === 'enum_declaration') {
    return 'enum';
  }

  return 'class';
}

function visitJavaNode(
  node: Parser.SyntaxNode,
  state: SymbolWalkState,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> | void {
  switch (node.type) {
    case 'import_declaration': {
      const specifier = getNodeText(node.namedChildren[0]);
      if (!specifier) {
        return;
      }

      const resolvedPath = sourceRoot ? resolveJavaTypePath(sourceRoot, specifier) : null;
      addImportRelation(relations, filePath, specifier, resolvedPath);
      importedBindings.set(getLastPathSegment(specifier, '.'), {
        importedName: specifier,
        resolvedPath,
        specifier,
      });
      return;
    }
    case 'class_declaration':
    case 'interface_declaration':
    case 'enum_declaration': {
      const name = getIdentifierText(node.childForFieldName('name'));
      if (name) {
        symbols.push(createSymbol(filePath, getJavaTypeDeclarationKind(node), name, node));
      }

      if (node.type === 'enum_declaration') {
        return;
      }

      const superclassNode = node.childForFieldName('superclass');
      const superclass = superclassNode?.namedChildren.find((child) => child.type === 'type_identifier');
      if (superclass) {
        addInheritRelation(
          relations,
          filePath,
          superclass.text,
          resolveJavaReferencePath(sourceRoot, packageName, importedBindings, superclass.text),
        );
      }
      return;
    }
    case 'method_declaration': {
      const name = getIdentifierText(node.childForFieldName('name'));
      if (!name) {
        return;
      }

      const symbol = createSymbol(filePath, 'method', name, node);
      symbols.push(symbol);
      return walkSymbolBody(node, symbol.id, walk);
    }
    case 'method_invocation': {
      const objectNode = node.childForFieldName('object');
      const objectIdentifier = getIdentifierText(objectNode);
      const binding = objectIdentifier ? importedBindings.get(objectIdentifier) ?? null : null;
      if (binding) {
        addCallRelation(relations, filePath, binding, state.currentSymbolId);
      }
      return;
    }
    default:
      return;
  }
}

export function analyzeJavaFile(
  filePath: string,
  tree: Parser.Tree,
): IFileAnalysisResult {
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];
  const packageName = getJavaPackageName(tree);
  const sourceRoot = resolveJavaSourceRoot(filePath, packageName);
  walkTree(tree.rootNode, {}, (node, state, walk) =>
    visitJavaNode(
      node,
      state,
      walk,
      filePath,
      sourceRoot,
      packageName,
      relations,
      symbols,
      importedBindings,
    ),
  );
  return normalizeAnalysisResult(filePath, symbols, relations);
}
