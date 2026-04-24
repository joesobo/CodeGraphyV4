import type Parser from 'tree-sitter';
import type {
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../../../core/plugins/types/contracts';
import { TREE_SITTER_SOURCE_IDS } from '../languages';
import type { ImportedBinding } from './model';

export function createRange(node: Parser.SyntaxNode): IAnalysisRange {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

export function createSymbolId(
  filePath: string,
  kind: string,
  name: string,
  signature?: string,
): string {
  return signature
    ? `${filePath}:${kind}:${name}:${signature}`
    : `${filePath}:${kind}:${name}`;
}

export function createSymbol(
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

export function normalizeAnalysisResult(
  filePath: string,
  symbols: IAnalysisSymbol[],
  relations: IAnalysisRelation[],
): IFileAnalysisResult {
  return {
    filePath,
    relations: relations.map((relation) => ({
      ...relation,
      pluginId: 'codegraphy.treesitter',
    })),
    symbols,
  };
}

export function addRelation(
  relations: IAnalysisRelation[],
  relation: IAnalysisRelation,
): void {
  relations.push(relation);
}

export function addImportRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
  type?: string,
  sourceId: string = TREE_SITTER_SOURCE_IDS.import,
  binding?: ImportedBinding,
): void {
  addRelation(relations, {
    kind: 'import',
    sourceId,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
    type,
    metadata: createBindingMetadata(binding),
  });
}

export function addTypeImportRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
): void {
  addRelation(relations, {
    kind: 'type-import',
    sourceId: TREE_SITTER_SOURCE_IDS.typeImport,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}

export function addCallRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  binding: ImportedBinding,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    kind: 'call',
    sourceId: TREE_SITTER_SOURCE_IDS.call,
    fromFilePath: filePath,
    fromSymbolId,
    specifier: binding.specifier,
    resolvedPath: binding.resolvedPath,
    toFilePath: binding.resolvedPath,
    metadata: createBindingMetadata(binding),
  });
}

function createBindingMetadata(binding?: ImportedBinding): IAnalysisRelation['metadata'] | undefined {
  if (!binding) {
    return undefined;
  }

  return {
    bindingKind: binding.bindingKind ?? null,
    importedName: binding.importedName ?? null,
    localName: binding.localName ?? null,
    memberName: binding.memberName ?? null,
  };
}

export function addInheritRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null = null,
): void {
  addRelation(relations, {
    kind: 'inherit',
    sourceId: TREE_SITTER_SOURCE_IDS.inherit,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}

export function addReferenceRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    kind: 'reference',
    sourceId: TREE_SITTER_SOURCE_IDS.reference,
    fromFilePath: filePath,
    fromSymbolId,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}
