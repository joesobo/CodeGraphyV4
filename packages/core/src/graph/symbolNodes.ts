import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphEdge, IGraphNode } from './contracts';
import { createGraphEdgeId } from './edgeIdentity';
import { normalizeSymbolKind, toRepoRelativeGraphPath } from './symbolPaths';

const SYMBOL_NODE_COLOR = '#8B5CF6';
const VARIABLE_NODE_COLOR = '#14B8A6';
const VARIABLE_SYMBOL_KINDS = new Set(['constant', 'field', 'global', 'variable']);

export function createSymbolNode(
  symbol: IAnalysisSymbol,
  id: string,
  workspaceRoot: string,
  containingFile: { churn?: number; fileSize?: number; gitIgnored?: boolean } = {},
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
    ...(containingFile.gitIgnored
      ? { metadata: { gitIgnored: true, gitIgnoredReason: '.gitignore' } }
      : {}),
    symbol: {
      id,
      name: symbol.name,
      kind,
      filePath,
      ...(typeof symbol.metadata?.pluginKind === 'string' ? { pluginKind: symbol.metadata.pluginKind } : {}),
      ...(typeof symbol.metadata?.language === 'string' ? { language: symbol.metadata.language } : {}),
      ...(typeof symbol.metadata?.source === 'string' ? { source: symbol.metadata.source } : {}),
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
