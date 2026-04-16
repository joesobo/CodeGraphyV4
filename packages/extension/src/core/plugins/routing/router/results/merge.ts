import type { IFileAnalysisResult } from '../../../types/contracts';
import { getRelationKey } from './keys';

export function createEmptyFileAnalysisResult(filePath: string): IFileAnalysisResult {
  return {
    filePath,
    edgeTypes: [],
    nodeTypes: [],
    nodes: [],
    relations: [],
    symbols: [],
  };
}

export function mergeById<TItem extends { id: string }>(
  baseItems: TItem[] | undefined,
  nextItems: TItem[] | undefined,
): TItem[] {
  const merged = new Map<string, TItem>();

  for (const item of baseItems ?? []) {
    merged.set(item.id, item);
  }

  for (const item of nextItems ?? []) {
    merged.set(item.id, item);
  }

  return [...merged.values()];
}

export function mergeRelations(
  baseRelations: NonNullable<IFileAnalysisResult['relations']> | undefined,
  nextRelations: NonNullable<IFileAnalysisResult['relations']> | undefined,
): NonNullable<IFileAnalysisResult['relations']> {
  const merged = new Map<string, NonNullable<IFileAnalysisResult['relations']>[number]>();

  for (const relation of baseRelations ?? []) {
    merged.set(getRelationKey(relation), relation);
  }

  for (const relation of nextRelations ?? []) {
    merged.set(getRelationKey(relation), relation);
  }

  return [...merged.values()];
}

export function mergeFileAnalysisResults(
  baseResult: IFileAnalysisResult,
  nextResult: IFileAnalysisResult,
): IFileAnalysisResult {
  return {
    filePath: nextResult.filePath || baseResult.filePath,
    edgeTypes: mergeById(baseResult.edgeTypes, nextResult.edgeTypes),
    nodeTypes: mergeById(baseResult.nodeTypes, nextResult.nodeTypes),
    nodes: mergeById(baseResult.nodes, nextResult.nodes),
    relations: mergeRelations(baseResult.relations, nextResult.relations),
    symbols: mergeById(baseResult.symbols, nextResult.symbols),
  };
}
