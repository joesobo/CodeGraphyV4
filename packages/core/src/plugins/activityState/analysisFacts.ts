import type {
  IAnalysisNode,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';

function readStringMetadataValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function readAnalysisSymbolPluginId(symbol: IAnalysisSymbol): string | undefined {
  return readStringMetadataValue(symbol.metadata?.pluginId)
    ?? readStringMetadataValue(symbol.metadata?.source);
}

function readAnalysisNodePluginId(node: IAnalysisNode): string | undefined {
  return readStringMetadataValue(node.metadata?.pluginId)
    ?? readStringMetadataValue(node.metadata?.source);
}

function hasDisabledPluginId(
  pluginId: string | undefined,
  disabledPlugins: ReadonlySet<string>,
): boolean {
  return pluginId !== undefined && disabledPlugins.has(pluginId);
}

function filterOptionalFacts<T>(
  facts: readonly T[] | undefined,
  isDisabledFact: (fact: T) => boolean,
): T[] | undefined {
  return facts?.filter(fact => !isDisabledFact(fact));
}

export function filterDisabledPluginAnalysisFacts(
  analysis: IFileAnalysisResult,
  disabledPlugins: ReadonlySet<string>,
): IFileAnalysisResult {
  if (disabledPlugins.size === 0) {
    return analysis;
  }

  return {
    ...analysis,
    nodes: filterOptionalFacts(
      analysis.nodes,
      node => hasDisabledPluginId(readAnalysisNodePluginId(node), disabledPlugins),
    ),
    symbols: filterOptionalFacts(
      analysis.symbols,
      symbol => hasDisabledPluginId(readAnalysisSymbolPluginId(symbol), disabledPlugins),
    ),
    relations: filterOptionalFacts(
      analysis.relations,
      relation => hasDisabledPluginId(relation.pluginId, disabledPlugins),
    ),
  };
}

export function filterDisabledPluginFileAnalysis(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  disabledPlugins: ReadonlySet<string>,
): ReadonlyMap<string, IFileAnalysisResult> {
  if (disabledPlugins.size === 0) {
    return fileAnalysis;
  }

  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      filePath,
      filterDisabledPluginAnalysisFacts(analysis, disabledPlugins),
    ]),
  );
}

function hasInactivePluginId(
  pluginId: string | undefined,
  activePluginIds: ReadonlySet<string>,
): boolean {
  return pluginId !== undefined && !activePluginIds.has(pluginId);
}

export function filterInactivePluginAnalysisFacts(
  analysis: IFileAnalysisResult,
  activePluginIds: ReadonlySet<string>,
): IFileAnalysisResult {
  return {
    ...analysis,
    nodes: filterOptionalFacts(
      analysis.nodes,
      node => hasInactivePluginId(readAnalysisNodePluginId(node), activePluginIds),
    ),
    symbols: filterOptionalFacts(
      analysis.symbols,
      symbol => hasInactivePluginId(readAnalysisSymbolPluginId(symbol), activePluginIds),
    ),
    relations: filterOptionalFacts(
      analysis.relations,
      relation => hasInactivePluginId(relation.pluginId, activePluginIds),
    ),
  };
}

export function filterInactivePluginFileAnalysis(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  activePluginIds: ReadonlySet<string>,
): ReadonlyMap<string, IFileAnalysisResult> {
  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      filePath,
      filterInactivePluginAnalysisFacts(analysis, activePluginIds),
    ]),
  );
}

export function filterDisabledPluginSnapshotFacts(
  snapshot: {
    symbols: readonly IAnalysisSymbol[];
    relations: readonly IAnalysisRelation[];
  },
  disabledPlugins: ReadonlySet<string>,
): {
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
} {
  if (disabledPlugins.size === 0) {
    return {
      symbols: [...snapshot.symbols],
      relations: [...snapshot.relations],
    };
  }

  return {
    symbols: snapshot.symbols.filter(symbol =>
      !hasDisabledPluginId(readAnalysisSymbolPluginId(symbol), disabledPlugins),
    ),
    relations: snapshot.relations.filter(relation =>
      !hasDisabledPluginId(relation.pluginId, disabledPlugins),
    ),
  };
}

export function filterInactivePluginSnapshotFacts(
  snapshot: {
    symbols: readonly IAnalysisSymbol[];
    relations: readonly IAnalysisRelation[];
  },
  activePluginIds: ReadonlySet<string>,
): {
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
} {
  return {
    symbols: snapshot.symbols.filter(symbol =>
      !hasInactivePluginId(readAnalysisSymbolPluginId(symbol), activePluginIds),
    ),
    relations: snapshot.relations.filter(relation =>
      !hasInactivePluginId(relation.pluginId, activePluginIds),
    ),
  };
}
