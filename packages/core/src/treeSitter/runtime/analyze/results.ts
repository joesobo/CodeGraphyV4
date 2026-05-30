import type Parser from 'tree-sitter';
import type {
  IAnalysisRange,
  IAnalysisRelationshipEvidence,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
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
  relations: IAnalysisRelationshipEvidence[],
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
  relations: IAnalysisRelationshipEvidence[],
  relation: IAnalysisRelationshipEvidence,
): void {
  relations.push(relation);
}

export function createFileTarget(
  resolvedPath: string | null,
  specifier: string,
): IAnalysisRelationshipEvidence['target'] {
  return resolvedPath
    ? { kind: 'file', path: resolvedPath, pathKind: 'absolute', specifier }
    : { kind: 'unresolved', specifier };
}

export function addImportRelation(
  relations: IAnalysisRelationshipEvidence[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
  type?: string,
  sourceId: string = TREE_SITTER_SOURCE_IDS.import,
  binding?: ImportedBinding,
): void {
  addRelation(relations, {
    edgeType: 'import',
    sourceId,
    from: { kind: 'file', filePath },
    target: createFileTarget(resolvedPath, specifier),
    timing: type,
    metadata: createBindingMetadata(binding),
  });
}

export function addTypeImportRelation(
  relations: IAnalysisRelationshipEvidence[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
  binding?: ImportedBinding,
): void {
  addRelation(relations, {
    edgeType: 'type-import',
    sourceId: TREE_SITTER_SOURCE_IDS.typeImport,
    from: { kind: 'file', filePath },
    target: createFileTarget(resolvedPath, specifier),
    metadata: createBindingMetadata(binding),
  });
}

export function addCallRelation(
  relations: IAnalysisRelationshipEvidence[],
  filePath: string,
  binding: ImportedBinding,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    edgeType: 'call',
    sourceId: TREE_SITTER_SOURCE_IDS.call,
    from: fromSymbolId ? { kind: 'symbol', symbolId: fromSymbolId, filePath } : { kind: 'file', filePath },
    target: createFileTarget(binding.resolvedPath, binding.specifier),
    metadata: createBindingMetadata(binding),
  });
}

function createBindingMetadata(binding?: ImportedBinding): IAnalysisRelationshipEvidence['metadata'] | undefined {
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
  relations: IAnalysisRelationshipEvidence[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null = null,
): void {
  addRelation(relations, {
    edgeType: 'inherit',
    sourceId: TREE_SITTER_SOURCE_IDS.inherit,
    from: { kind: 'file', filePath },
    target: createFileTarget(resolvedPath, specifier),
  });
}

export function addReferenceRelation(
  relations: IAnalysisRelationshipEvidence[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
  fromSymbolId?: string,
): void {
  addRelation(relations, {
    edgeType: 'reference',
    sourceId: TREE_SITTER_SOURCE_IDS.reference,
    from: fromSymbolId ? { kind: 'symbol', symbolId: fromSymbolId, filePath } : { kind: 'file', filePath },
    target: createFileTarget(resolvedPath, specifier),
  });
}
