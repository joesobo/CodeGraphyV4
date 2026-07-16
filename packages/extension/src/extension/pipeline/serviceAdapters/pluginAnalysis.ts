import type { IFileAnalysisResult } from '../../../core/plugins/types/contracts';

function isPluginActive(
  pluginId: string | undefined,
  activePluginIds: ReadonlySet<string>,
  disabledPlugins: ReadonlySet<string>,
): boolean {
  return !pluginId || (activePluginIds.has(pluginId) && !disabledPlugins.has(pluginId));
}

function readSymbolPluginId(
  symbol: NonNullable<IFileAnalysisResult['symbols']>[number],
): string | undefined {
  const pluginId = symbol.metadata?.pluginId;
  const source = symbol.metadata?.source;
  return typeof pluginId === 'string' && pluginId.length > 0
    ? pluginId
    : typeof source === 'string' && source.length > 0 ? source : undefined;
}

export function filterAnalysisByActivePlugins(
  fileAnalysis: Map<string, IFileAnalysisResult>,
  activePluginIds: ReadonlySet<string>,
  disabledPlugins: ReadonlySet<string>,
): Map<string, IFileAnalysisResult> {
  return new Map([...fileAnalysis].map(([filePath, analysis]) => {
    const relations = analysis.relations ?? [];
    const activeRelations = relations.filter(relation =>
      isPluginActive(relation.pluginId, activePluginIds, disabledPlugins));
    const symbols = analysis.symbols ?? [];
    const activeSymbols = symbols.filter(symbol =>
      isPluginActive(readSymbolPluginId(symbol), activePluginIds, disabledPlugins));
    const unchanged = activeRelations.length === relations.length
      && activeSymbols.length === symbols.length;
    return [filePath, unchanged
      ? analysis
      : { ...analysis, relations: activeRelations, symbols: activeSymbols }];
  }));
}
