import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { NodeType } from '../graph/contracts';
import { getNodeType } from '../visibleGraph/model';
import type { GraphQueryData } from './data';
import type {
  GraphQueryNodeReportItem,
  GraphQueryOverviewConfig,
  GraphQueryOverviewReport,
  GraphQuerySourceContext,
  GraphQuerySymbolReport,
  GraphQueryTargetNotFoundReport,
} from './model';
import { toNodeReportItem } from './nodeReport';
import { listGraphEdges } from './reports';
import { listGraphSymbols } from './symbols';
import { toSymbolReportBase } from './symbols/metadata';

const DECLARED_SYMBOL_LIMIT = 25;
const RELATIONSHIP_LIMIT = 25;
const SOURCE_CONTEXT_LINE_LIMIT = 80;
const SOURCE_CONTEXT_CHARACTER_LIMIT = 8_000;

function symbolTarget(symbol: IAnalysisSymbol): GraphQueryNodeReportItem {
  return {
    path: symbol.id,
    nodeType: `symbol:${symbol.kind ?? 'unknown'}` as NodeType,
    symbol: {
      ...toSymbolReportBase(symbol),
      id: symbol.id,
      kind: symbol.kind ?? 'unknown',
      filePath: symbol.filePath,
    },
  };
}

function resolveTarget(data: GraphQueryData, selector: string): GraphQueryNodeReportItem | undefined {
  const node = data.graphData.nodes.find(candidate => candidate.id === selector);
  if (node) return toNodeReportItem(node);
  const symbol = data.symbols?.find(candidate => candidate.id === selector);
  return symbol ? symbolTarget(symbol) : undefined;
}

function declarationKindRank(kind: string | undefined): number {
  const ranks: Record<string, number> = {
    function: 0,
    method: 0,
    class: 1,
    interface: 1,
    type: 1,
    enum: 1,
    constant: 3,
    variable: 3,
  };
  return kind ? ranks[kind] ?? 2 : 2;
}

function listOverviewSymbols(data: GraphQueryData, filePath: string): GraphQuerySymbolReport {
  const complete = listGraphSymbols(data, {
    filePath,
    limit: Math.max(1, data.symbols?.length ?? 0),
  }).symbols.sort((left, right) => (
    declarationKindRank(left.kind) - declarationKindRank(right.kind)
    || left.name.localeCompare(right.name)
    || (left.id ?? '').localeCompare(right.id ?? '')
  ));
  const symbols = complete.slice(0, DECLARED_SYMBOL_LIMIT);
  return {
    symbols,
    page: {
      offset: 0,
      limit: DECLARED_SYMBOL_LIMIT,
      returned: symbols.length,
      total: complete.length,
      nextOffset: complete.length > DECLARED_SYMBOL_LIMIT ? DECLARED_SYMBOL_LIMIT : null,
    },
  };
}

function createSourceContext(
  data: GraphQueryData,
  symbol: IAnalysisSymbol | undefined,
): GraphQuerySourceContext | undefined {
  if (!symbol) return undefined;
  const sourceFile = data.sourceText?.files.find(file => file.filePath === symbol.filePath);
  if (!sourceFile) return undefined;
  const lines = sourceFile.content.split(/\r?\n/u);
  const matchedLine = lines.findIndex(line => line.includes(symbol.name));
  const startIndex = Math.max(0, (symbol.range?.startLine ?? matchedLine + 1) - 1);
  const requestedEnd = symbol.range?.endLine ?? startIndex + SOURCE_CONTEXT_LINE_LIMIT;
  const endIndex = Math.min(lines.length, requestedEnd, startIndex + SOURCE_CONTEXT_LINE_LIMIT);
  const completeText = lines.slice(startIndex, endIndex).join('\n');
  const text = completeText.slice(0, SOURCE_CONTEXT_CHARACTER_LIMIT);
  return {
    filePath: symbol.filePath,
    startLine: startIndex + 1,
    endLine: endIndex,
    text,
    truncated: (symbol.range
      ? requestedEnd > endIndex
      : startIndex + SOURCE_CONTEXT_LINE_LIMIT < lines.length)
      || text.length < completeText.length,
    freshness: 'live',
  };
}

export function inspectGraphTarget(
  data: GraphQueryData,
  config: GraphQueryOverviewConfig,
): GraphQueryOverviewReport | GraphQueryTargetNotFoundReport {
  const target = resolveTarget(data, config.target);
  if (!target) {
    return {
      error: 'query_target_not_found',
      message: `No indexed Node or Symbol has the exact id: ${config.target}`,
    };
  }

  const relationshipData = {
    ...data,
    graphData: {
      nodes: data.graphData.nodes,
      edges: data.graphData.edges.filter(edge => edge.kind !== 'contains'),
    },
  };
  const completeScope = {
    nodes: Object.fromEntries(data.graphData.nodes.map(node => [getNodeType(node), true])),
    edges: Object.fromEntries(data.graphData.edges.map(edge => [edge.kind, true])),
  };
  const filePath = target.symbol?.filePath ?? target.path;
  const targetSymbol = target.symbol
    ? data.symbols?.find(symbol => symbol.id === target.path)
    : undefined;
  const sourceContext = createSourceContext(data, targetSymbol);

  return {
    target,
    declaredSymbols: target.symbol
      ? listGraphSymbols(data, { filePath: '__symbol-target__', limit: DECLARED_SYMBOL_LIMIT })
      : listOverviewSymbols(data, filePath),
    ...(sourceContext ? { sourceContext } : {}),
    outgoing: listGraphEdges(relationshipData.graphData, {
      from: target.path,
      scope: completeScope,
      expandFileSelectors: !target.symbol,
      projectFileEndpoints: !target.symbol,
      limit: RELATIONSHIP_LIMIT,
    }),
    incoming: listGraphEdges(relationshipData.graphData, {
      to: target.path,
      scope: completeScope,
      expandFileSelectors: !target.symbol,
      projectFileEndpoints: !target.symbol,
      limit: RELATIONSHIP_LIMIT,
    }),
    limits: {
      declaredSymbols: DECLARED_SYMBOL_LIMIT,
      relationshipsPerDirection: RELATIONSHIP_LIMIT,
    },
  };
}
