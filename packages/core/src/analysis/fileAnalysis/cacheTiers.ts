import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';

export const BASELINE_ANALYSIS_CACHE_TIER = 'baseline';
export const SYMBOLS_ANALYSIS_CACHE_TIER = 'symbols';

export type AnalysisCacheTier =
  | typeof BASELINE_ANALYSIS_CACHE_TIER
  | typeof SYMBOLS_ANALYSIS_CACHE_TIER
  | `plugin:${string}`;

export interface AnalysisCacheTierOptions {
  active?: readonly AnalysisCacheTier[];
  completed?: readonly AnalysisCacheTier[];
  required?: readonly AnalysisCacheTier[];
}

interface TieredFileAnalysisResult extends IFileAnalysisResult {
  cache?: {
    tiers?: string[];
  };
}

function readExplicitCacheTiers(analysis: IFileAnalysisResult): readonly string[] | undefined {
  const tiers = (analysis as TieredFileAnalysisResult).cache?.tiers;
  return Array.isArray(tiers) ? tiers : undefined;
}

function hasSymbolFacts(analysis: IFileAnalysisResult): boolean {
  return Boolean(
    analysis.symbols?.length
    || analysis.relations?.some(relation => relation.fromSymbolId || relation.toSymbolId),
  );
}

function readStringMetadataValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readSymbolPluginId(symbol: IAnalysisSymbol): string | undefined {
  return readStringMetadataValue(symbol.metadata?.pluginId)
    ?? readStringMetadataValue(symbol.metadata?.source);
}

function hasPluginFacts(analysis: IFileAnalysisResult, pluginId: string): boolean {
  return Boolean(
    analysis.relations?.some(relation => relation.pluginId === pluginId)
    || analysis.symbols?.some(symbol => readSymbolPluginId(symbol) === pluginId),
  );
}

function isCacheTierSatisfied(analysis: IFileAnalysisResult, tier: AnalysisCacheTier): boolean {
  if (tier === BASELINE_ANALYSIS_CACHE_TIER) {
    return true;
  }

  const explicitTiers = readExplicitCacheTiers(analysis);
  if (explicitTiers) {
    return explicitTiers.includes(tier);
  }

  if (tier === SYMBOLS_ANALYSIS_CACHE_TIER) {
    return hasSymbolFacts(analysis) || analysis.symbols !== undefined;
  }

  if (tier.startsWith('plugin:')) {
    return hasPluginFacts(analysis, tier.slice('plugin:'.length));
  }

  return false;
}

export function hasRequiredAnalysisCacheTiers(
  analysis: IFileAnalysisResult,
  requiredTiers: readonly AnalysisCacheTier[] | undefined,
): boolean {
  return (requiredTiers ?? []).every(tier => isCacheTierSatisfied(analysis, tier));
}

function isSymbolTierActive(activeTiers: readonly AnalysisCacheTier[] | undefined): boolean {
  return activeTiers === undefined || activeTiers.includes(SYMBOLS_ANALYSIS_CACHE_TIER);
}

function stripSymbolRelationEndpoints(relation: IAnalysisRelation): IAnalysisRelation | undefined {
  if (!relation.fromSymbolId && !relation.toSymbolId) {
    return relation;
  }

  if (!relation.toFilePath && !relation.resolvedPath && !relation.toNodeId) {
    return undefined;
  }

  const fileLevelRelation = { ...relation };
  delete fileLevelRelation.fromSymbolId;
  delete fileLevelRelation.toSymbolId;
  return fileLevelRelation;
}

export function projectAnalysisForCacheTiers(
  analysis: IFileAnalysisResult,
  activeTiers: readonly AnalysisCacheTier[] | undefined,
): IFileAnalysisResult {
  if (isSymbolTierActive(activeTiers)) {
    return analysis;
  }

  return {
    ...analysis,
    relations: (analysis.relations ?? [])
      .map(stripSymbolRelationEndpoints)
      .filter((relation): relation is IAnalysisRelation => relation !== undefined),
    symbols: [],
  };
}

function sortCacheTiers(tiers: Iterable<AnalysisCacheTier>): AnalysisCacheTier[] {
  const tierSet = new Set<AnalysisCacheTier>([
    BASELINE_ANALYSIS_CACHE_TIER,
    ...tiers,
  ]);
  return [...tierSet].sort((left, right) => {
    if (left === BASELINE_ANALYSIS_CACHE_TIER) {
      return -1;
    }
    if (right === BASELINE_ANALYSIS_CACHE_TIER) {
      return 1;
    }
    if (left === SYMBOLS_ANALYSIS_CACHE_TIER) {
      return -1;
    }
    if (right === SYMBOLS_ANALYSIS_CACHE_TIER) {
      return 1;
    }
    return left.localeCompare(right);
  });
}

export function markAnalysisCacheTiers(
  analysis: IFileAnalysisResult,
  completedTiers: readonly AnalysisCacheTier[] | undefined,
): IFileAnalysisResult {
  if (completedTiers === undefined) {
    return analysis;
  }

  const tieredAnalysis: TieredFileAnalysisResult = {
    ...(analysis as TieredFileAnalysisResult),
    cache: {
      ...(analysis as TieredFileAnalysisResult).cache,
      tiers: sortCacheTiers(completedTiers),
    },
  };
  return tieredAnalysis;
}

export function createPluginAnalysisCacheTier(pluginId: string): AnalysisCacheTier {
  return `plugin:${pluginId}`;
}
