import Parser from 'tree-sitter';
import type {
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../core/plugins/types/contracts';
import { getTreeSitterLanguageForFile, TREE_SITTER_SOURCE_IDS } from './languages';
import { resolveTreeSitterImportPath } from './resolve';

interface ImportedBinding {
  importedName?: string;
  resolvedPath: string | null;
  specifier: string;
}

function createRange(node: Parser.SyntaxNode): IAnalysisRange {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function createSymbolId(
  filePath: string,
  kind: string,
  name: string,
  signature?: string,
): string {
  return signature
    ? `${filePath}:${kind}:${name}:${signature}`
    : `${filePath}:${kind}:${name}`;
}

function createSymbol(
  filePath: string,
  kind: string,
  name: string,
  node: Parser.SyntaxNode,
  signature?: string,
): IAnalysisSymbol {
  return {
    id: createSymbolId(filePath, kind, name, signature),
    filePath,
    kind,
    name,
    range: createRange(node),
    signature,
  };
}

function getStringSpecifier(node: Parser.SyntaxNode): string | null {
  if (node.type !== 'string') {
    return null;
  }

  const fragment = node.namedChildren.find((child) => child.type === 'string_fragment');
  if (fragment) {
    return fragment.text;
  }

  return node.text.length >= 2 ? node.text.slice(1, -1) : null;
}

function getIdentifierText(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case 'identifier':
    case 'property_identifier':
    case 'type_identifier':
      return node.text;
    default:
      return null;
  }
}

function addNamedImportBindings(
  node: Parser.SyntaxNode,
  importedBindings: Map<string, ImportedBinding>,
  specifier: string,
  resolvedPath: string | null,
): void {
  for (const importSpecifier of node.namedChildren.filter((child) => child.type === 'import_specifier')) {
    const identifiers = importSpecifier.namedChildren.filter((child) =>
      child.type === 'identifier' || child.type === 'type_identifier',
    );
    const importedName = identifiers[0]?.text;
    const localName = identifiers.at(-1)?.text;
    if (!localName) {
      continue;
    }

    importedBindings.set(localName, {
      importedName,
      resolvedPath,
      specifier,
    });
  }
}

function collectImportBindings(
  statement: Parser.SyntaxNode,
  specifier: string,
  resolvedPath: string | null,
  importedBindings: Map<string, ImportedBinding>,
): void {
  const importClause = statement.namedChildren.find((child) => child.type === 'import_clause');
  if (!importClause) {
    return;
  }

  for (const child of importClause.namedChildren) {
    if (child.type === 'identifier') {
      importedBindings.set(child.text, {
        importedName: 'default',
        resolvedPath,
        specifier,
      });
      continue;
    }

    if (child.type === 'named_imports') {
      addNamedImportBindings(child, importedBindings, specifier, resolvedPath);
      continue;
    }

    if (child.type === 'namespace_import') {
      const localName = child.namedChildren.find((namedChild) => namedChild.type === 'identifier')?.text;
      if (localName) {
        importedBindings.set(localName, {
          importedName: '*',
          resolvedPath,
          specifier,
        });
      }
    }
  }
}

function getImportedBindingForCall(
  callExpression: Parser.SyntaxNode,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const calleeNode = callExpression.childForFieldName('function') ?? callExpression.namedChildren[0];
  const directIdentifier = getIdentifierText(calleeNode);
  if (directIdentifier) {
    return importedBindings.get(directIdentifier) ?? null;
  }

  if (calleeNode?.type !== 'member_expression') {
    return null;
  }

  const objectNode = calleeNode.childForFieldName('object') ?? calleeNode.namedChildren[0];
  const objectIdentifier = getIdentifierText(objectNode);
  return objectIdentifier ? importedBindings.get(objectIdentifier) ?? null : null;
}

function pushImportRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  kind: IAnalysisRelation['kind'],
  specifier: string,
  resolvedPath: string | null,
): void {
  relations.push({
    kind,
    sourceId:
      kind === 'reexport'
        ? TREE_SITTER_SOURCE_IDS.reexport
        : TREE_SITTER_SOURCE_IDS.import,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}

function createTreeSitterParser(filePath: string): Parser | null {
  const language = getTreeSitterLanguageForFile(filePath);
  if (!language) {
    return null;
  }

  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}

export async function analyzeFileWithTreeSitter(
  filePath: string,
  content: string,
  _workspaceRoot: string,
): Promise<IFileAnalysisResult | null> {
  const parser = createTreeSitterParser(filePath);
  if (!parser) {
    return null;
  }

  const tree = parser.parse(content);
  const importedBindings = new Map<string, ImportedBinding>();
  const relations: IAnalysisRelation[] = [];
  const symbols: IAnalysisSymbol[] = [];

  const walk = (
    node: Parser.SyntaxNode,
    currentSymbolId?: string,
  ): void => {
    switch (node.type) {
      case 'import_statement': {
        const specifierNode = node.namedChildren.find((child) => child.type === 'string');
        const specifier = specifierNode ? getStringSpecifier(specifierNode) : null;
        if (specifier) {
          const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
          collectImportBindings(node, specifier, resolvedPath, importedBindings);
          pushImportRelation(relations, filePath, 'import', specifier, resolvedPath);
        }
        return;
      }

      case 'export_statement': {
        const specifierNode = node.namedChildren.find((child) => child.type === 'string');
        const specifier = specifierNode ? getStringSpecifier(specifierNode) : null;
        if (specifier) {
          pushImportRelation(
            relations,
            filePath,
            'reexport',
            specifier,
            resolveTreeSitterImportPath(filePath, specifier),
          );
        }
        break;
      }

      case 'function_declaration': {
        const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
        if (!name) {
          break;
        }

        const symbol = createSymbol(filePath, 'function', name, node);
        symbols.push(symbol);
        const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
        if (body) {
          walk(body, symbol.id);
        }
        return;
      }

      case 'class_declaration': {
        const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
        if (name) {
          symbols.push(createSymbol(filePath, 'class', name, node));
        }
        break;
      }

      case 'method_definition': {
        const name = getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
        if (!name) {
          break;
        }

        const symbol = createSymbol(filePath, 'method', name, node);
        symbols.push(symbol);
        const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
        if (body) {
          walk(body, symbol.id);
        }
        return;
      }

      case 'call_expression': {
        const binding = getImportedBindingForCall(node, importedBindings);
        if (binding) {
          relations.push({
            kind: 'call',
            sourceId: TREE_SITTER_SOURCE_IDS.call,
            fromFilePath: filePath,
            fromSymbolId: currentSymbolId,
            specifier: binding.specifier,
            resolvedPath: binding.resolvedPath,
            toFilePath: binding.resolvedPath,
          });
        }
        break;
      }
    }

    for (const child of node.namedChildren) {
      walk(child, currentSymbolId);
    }
  };

  walk(tree.rootNode);

  return {
    filePath,
    relations: relations.map((relation) => ({
      ...relation,
      pluginId: 'codegraphy.core.treesitter',
    })),
    symbols,
  };
}
