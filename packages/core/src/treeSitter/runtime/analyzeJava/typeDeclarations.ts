import type Parser from 'tree-sitter';
import type {
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import { getIdentifierText } from '../analyze/nodes';
import { createSymbol } from '../analyze/results';

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
  symbols: IAnalysisSymbol[],
): void {
  const name = getIdentifierText(node.childForFieldName('name'));
  if (name) {
    symbols.push(createSymbol(filePath, getJavaTypeDeclarationKind(node), name, node));
  }
}
