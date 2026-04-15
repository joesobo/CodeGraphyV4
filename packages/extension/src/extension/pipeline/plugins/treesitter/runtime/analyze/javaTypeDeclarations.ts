import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '../../../../../../core/plugins/types/contracts';
import { resolveJavaTypePath } from '../projectRoots';
import type { ImportedBinding } from './model';
import { getIdentifierText } from './nodes';
import { addInheritRelation, createSymbol } from './results';

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

export function handleJavaTypeDeclaration(
  node: Parser.SyntaxNode,
  filePath: string,
  sourceRoot: string | null,
  packageName: string | null,
  relations: IAnalysisRelation[],
  symbols: IAnalysisSymbol[],
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): void {
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
}
