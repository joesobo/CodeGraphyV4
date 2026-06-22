import type {
  IAnalysisRelation,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { CORE_GRAPH_NODE_TYPES } from '../../graphControls/defaults/definitions';
import { readAnalysisSymbolPluginId } from '../../plugins/activityState/analysisFacts';

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

export function readAnalysisCacheTiers(analysis: IFileAnalysisResult): readonly string[] {
  return readExplicitCacheTiers(analysis) ?? [];
}

function hasSymbolFacts(analysis: IFileAnalysisResult): boolean {
  return Boolean(
    analysis.symbols?.length
    || analysis.relations?.some(relation => relation.fromSymbolId || relation.toSymbolId),
  );
}

function hasPluginFacts(analysis: IFileAnalysisResult, pluginId: string): boolean {
  return Boolean(
    analysis.relations?.some(relation => relation.pluginId === pluginId)
    || analysis.symbols?.some(symbol => readAnalysisSymbolPluginId(symbol) === pluginId),
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

  if (isSameFileSymbolContainmentRelation(relation)) {
    return undefined;
  }

  if (!relation.toFilePath && !relation.resolvedPath && !relation.toNodeId) {
    return undefined;
  }

  const fileLevelRelation = { ...relation };
  delete fileLevelRelation.fromSymbolId;
  delete fileLevelRelation.toSymbolId;
  return fileLevelRelation;
}

function isSameFileSymbolContainmentRelation(relation: IAnalysisRelation): boolean {
  const targetPath = relation.resolvedPath ?? relation.toFilePath ?? null;
  return relation.kind === 'contains'
    && Boolean(targetPath)
    && targetPath === relation.fromFilePath;
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
      tiers: sortCacheTiers([
        ...(readAnalysisCacheTiers(analysis) as AnalysisCacheTier[]),
        ...completedTiers,
      ]),
    },
  };
  return tieredAnalysis;
}

export function createPluginAnalysisCacheTier(pluginId: string): AnalysisCacheTier {
  return `plugin:${pluginId}`;
}

function isSymbolScopedNodeType(nodeType: string): boolean {
  return nodeType === 'symbol'
    || nodeType === 'variable'
    || nodeType.startsWith('symbol:')
    || (nodeType.startsWith('plugin:') && nodeType.includes(':symbol:'));
}

const CORE_NODE_TYPE_BY_ID = new Map(CORE_GRAPH_NODE_TYPES.map((definition) => [definition.id, definition]));
const CORE_PARENT_NODE_TYPE_IDS = new Set(
  CORE_GRAPH_NODE_TYPES
    .map((definition) => definition.parentId)
    .filter((parentId): parentId is string => Boolean(parentId)),
);

function isLeafSymbolScopedNodeType(nodeType: string): boolean {
  return isSymbolScopedNodeType(nodeType) && !CORE_PARENT_NODE_TYPE_IDS.has(nodeType);
}

function hasEnabledParentNodeTypes(
  nodeType: string,
  nodeVisibility: Readonly<Record<string, boolean>>,
): boolean {
  let current = CORE_NODE_TYPE_BY_ID.get(nodeType);
  while (current?.parentId) {
    if (nodeVisibility[current.parentId] !== true) {
      return false;
    }
    current = CORE_NODE_TYPE_BY_ID.get(current.parentId);
  }

  return true;
}

export function requiresSymbolAnalysisCacheTier(
  nodeVisibility: Readonly<Record<string, boolean>>,
): boolean {
  return Object.entries(nodeVisibility).some(([nodeType, visible]) =>
    visible === true
    && isLeafSymbolScopedNodeType(nodeType)
    && hasEnabledParentNodeTypes(nodeType, nodeVisibility),
  );
}

export function createWorkspaceIndexAnalysisCacheTiers(
  nodeVisibility: Readonly<Record<string, boolean>>,
  pluginIds: readonly string[] = [],
): AnalysisCacheTierOptions {
  const activeTiers: AnalysisCacheTier[] = [BASELINE_ANALYSIS_CACHE_TIER];
  if (requiresSymbolAnalysisCacheTier(nodeVisibility)) {
    activeTiers.push(SYMBOLS_ANALYSIS_CACHE_TIER);
  }
  activeTiers.push(...pluginIds.map(createPluginAnalysisCacheTier));

  return {
    active: activeTiers,
    completed: activeTiers,
    required: activeTiers,
  };
}
