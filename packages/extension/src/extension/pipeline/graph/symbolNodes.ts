import type { IAnalysisSymbol } from '../../../core/plugins/types/contracts';
import type { IGraphEdge, IGraphNode } from '../../../shared/graph/contracts';
import { createGraphEdgeId } from '../../../shared/graph/edgeIdentity';
import { normalizeSymbolKind, toRepoRelativeGraphPath } from './symbolPaths';

const SYMBOL_NODE_COLOR = '#8B5CF6';
const VARIABLE_NODE_COLOR = '#14B8A6';
const VARIABLE_SYMBOL_KINDS = new Set(['constant', 'field', 'property', 'variable']);

export function createSymbolNode(
  symbol: IAnalysisSymbol,
  id: string,
  workspaceRoot: string,
  containingFile: { churn?: number; fileSize?: number } = {},
): IGraphNode {
  const filePath = toRepoRelativeGraphPath(symbol.filePath, workspaceRoot);
  const kind = normalizeSymbolKind(symbol.kind);
  const nodeType = VARIABLE_SYMBOL_KINDS.has(kind) ? 'variable' : 'symbol';

  return {
    id,
    label: symbol.name,
    color: nodeType === 'variable' ? VARIABLE_NODE_COLOR : SYMBOL_NODE_COLOR,
    nodeType,
    fileSize: containingFile.fileSize,
    churn: containingFile.churn,
    symbol: {
      id,
      name: symbol.name,
      kind,
      filePath,
      ...(symbol.range ? { range: symbol.range } : {}),
      ...(symbol.signature ? { signature: symbol.signature } : {}),
    },
  };
}

export function createContainsEdge(from: string, to: string): IGraphEdge {
  return {
    id: createGraphEdgeId({ from, to, kind: 'contains' }),
    from,
    to,
    kind: 'contains',
    sources: [],
  };
}
