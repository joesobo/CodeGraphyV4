import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addInheritRelation } from '../analyze/results';
import { resolveObjectiveCImportPathForType } from './importResolution';

export function addObjectiveCInheritance(
  relations: IAnalysisRelation[],
  filePath: string,
  source: string,
  symbolsEnabled: boolean,
): void {
  for (const match of source.matchAll(/^\s*@interface\s+([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)(?:\s*<([^>]+)>)?/gm)) {
    const inheritedNames = [match[2], ...(match[3]?.split(',').map(name => name.trim()).filter(Boolean) ?? [])];
    const symbolId = symbolsEnabled ? `${filePath}:class:${match[1]}` : undefined;
    addObjectiveCInheritedNames(relations, filePath, inheritedNames, symbolId);
  }
}

function addObjectiveCInheritedNames(
  relations: IAnalysisRelation[],
  filePath: string,
  inheritedNames: readonly string[],
  fromSymbolId: string | undefined,
): void {
  for (const typeName of inheritedNames) {
    addInheritRelation(relations, filePath, typeName, resolveObjectiveCImportPathForType(relations, typeName), fromSymbolId);
  }
}
