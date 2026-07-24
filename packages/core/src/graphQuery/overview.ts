import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { NodeType } from '../graph/contracts';
import { getNodeType } from '../visibleGraph/model';
import type { GraphQueryData } from './data';
import type {
  GraphQueryNodeReportItem,
  GraphQueryOverviewConfig,
  GraphQueryOverviewReport,
  GraphQueryTargetNotFoundReport,
} from './model';
import { toNodeReportItem } from './nodeReport';
import { listGraphEdges } from './reports';
import { listGraphSymbols } from './symbols';
import { toSymbolReportBase } from './symbols/metadata';

const DECLARED_SYMBOL_LIMIT = 25;
const RELATIONSHIP_LIMIT = 25;

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

  return {
    target,
    declaredSymbols: target.symbol
      ? listGraphSymbols(data, { filePath: '__symbol-target__', limit: DECLARED_SYMBOL_LIMIT })
      : listGraphSymbols(data, { filePath, limit: DECLARED_SYMBOL_LIMIT }),
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
