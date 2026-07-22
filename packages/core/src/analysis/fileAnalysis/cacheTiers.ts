import type {
  IAnalysisNode,
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

function readStringMetadataValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readAnalysisNodePluginId(node: IAnalysisNode): string | undefined {
  return readStringMetadataValue(node.metadata?.pluginId)
    ?? readStringMetadataValue(node.metadata?.source);
}

function readActivePluginIds(activeTiers: readonly AnalysisCacheTier[]): Set<string> {
  return new Set(
    activeTiers
      .filter((tier): tier is `plugin:${string}` => tier.startsWith('plugin:'))
      .map(tier => tier.slice('plugin:'.length)),
  );
}

function hasInactivePluginId(
  pluginId: string | undefined,
  activePluginIds: ReadonlySet<string>,
): boolean {
  return pluginId !== undefined && !activePluginIds.has(pluginId);
}

function hasPluginId(
  pluginId: string | undefined,
  pluginIds: ReadonlySet<string>,
): boolean {
  return pluginId !== undefined && pluginIds.has(pluginId);
}

function filterInactivePluginFacts(
  analysis: IFileAnalysisResult,
  activeTiers: readonly AnalysisCacheTier[],
): IFileAnalysisResult {
  const activePluginIds = readActivePluginIds(activeTiers);
  const projectedAnalysis: IFileAnalysisResult = { ...analysis };
  if (analysis.nodes) {
    projectedAnalysis.nodes = analysis.nodes.filter(node =>
      !hasInactivePluginId(readAnalysisNodePluginId(node), activePluginIds),
    );
  }
  if (analysis.symbols) {
    projectedAnalysis.symbols = analysis.symbols.filter(symbol =>
      !hasInactivePluginId(readAnalysisSymbolPluginId(symbol), activePluginIds),
    );
  }
  if (analysis.relations) {
    projectedAnalysis.relations = analysis.relations.filter(relation =>
      !hasInactivePluginId(relation.pluginId, activePluginIds),
    );
  }
  return projectedAnalysis;
}

function projectCacheTierMetadata(
  analysis: IFileAnalysisResult,
  activeTiers: readonly AnalysisCacheTier[],
): IFileAnalysisResult {
  const explicitTiers = readExplicitCacheTiers(analysis);
  if (!explicitTiers) {
    return analysis;
  }
  const activeTierSet = new Set(activeTiers);
  const retainedTiers = explicitTiers.filter((tier): tier is AnalysisCacheTier =>
    isAnalysisCacheTier(tier) && activeTierSet.has(tier),
  );

  const tieredAnalysis: TieredFileAnalysisResult = {
    ...(analysis as TieredFileAnalysisResult),
    cache: {
      ...(analysis as TieredFileAnalysisResult).cache,
      tiers: sortAnalysisCacheTiers(retainedTiers),
    },
  };
  return tieredAnalysis;
}

export function isAnalysisCacheTier(tier: string): tier is AnalysisCacheTier {
  return tier === BASELINE_ANALYSIS_CACHE_TIER
    || tier === SYMBOLS_ANALYSIS_CACHE_TIER
    || tier.startsWith('plugin:');
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
  if (activeTiers === undefined) {
    return analysis;
  }

  const pluginProjectedAnalysis = filterInactivePluginFacts(analysis, activeTiers);
  const projectedAnalysis = isSymbolTierActive(activeTiers)
    ? pluginProjectedAnalysis
    : stripInactiveSymbolFacts(pluginProjectedAnalysis);

  return projectCacheTierMetadata(projectedAnalysis, activeTiers);
}

export function removeAnalysisFactsForCacheTiers(
  analysis: IFileAnalysisResult,
  tiers: readonly AnalysisCacheTier[] | undefined,
): IFileAnalysisResult {
  const replacedPluginIds = readActivePluginIds(tiers ?? []);
  if (replacedPluginIds.size === 0) {
    return analysis;
  }

  const retainedAnalysis: IFileAnalysisResult = { ...analysis };
  if (analysis.nodes) {
    retainedAnalysis.nodes = analysis.nodes.filter(node =>
      !hasPluginId(readAnalysisNodePluginId(node), replacedPluginIds),
    );
  }
  if (analysis.symbols) {
    retainedAnalysis.symbols = analysis.symbols.filter(symbol =>
      !hasPluginId(readAnalysisSymbolPluginId(symbol), replacedPluginIds),
    );
  }
  if (analysis.relations) {
    retainedAnalysis.relations = analysis.relations.filter(relation =>
      !hasPluginId(relation.pluginId, replacedPluginIds),
    );
  }
  return retainedAnalysis;
}

function stripInactiveSymbolFacts(analysis: IFileAnalysisResult): IFileAnalysisResult {
  const projectedAnalysis: IFileAnalysisResult = {
    ...analysis,
    relations: (analysis.relations ?? [])
      .map(stripSymbolRelationEndpoints)
      .filter((relation): relation is IAnalysisRelation => relation !== undefined),
  };
  if (analysis.symbols) {
    projectedAnalysis.symbols = [];
  }
  return projectedAnalysis;
}

export function sortAnalysisCacheTiers(tiers: Iterable<AnalysisCacheTier>): AnalysisCacheTier[] {
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
      tiers: sortAnalysisCacheTiers([
        ...readAnalysisCacheTiers(analysis).filter(isAnalysisCacheTier),
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
  pluginIds: readonly string[] = [],
): AnalysisCacheTierOptions {
  const activeTiers: AnalysisCacheTier[] = [
    BASELINE_ANALYSIS_CACHE_TIER,
    SYMBOLS_ANALYSIS_CACHE_TIER,
  ];
  activeTiers.push(...pluginIds.map(createPluginAnalysisCacheTier));

  return {
    active: activeTiers,
    completed: activeTiers,
    required: activeTiers,
  };
}
