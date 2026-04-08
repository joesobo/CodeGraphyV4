import type { IGraphEdge } from '../../../shared/graph/types';
import { UNATTRIBUTED_RULE_KEY, type ExportRule } from '../shared/contracts';

export interface SourceMeta {
  name: string;
  plugin: string;
}

export function resolveSourceKeys(
  edge: Pick<IGraphEdge, 'sources'>,
  qualifiedBySourceId: Map<string, string[]>,
): string[] {
  if (edge.sources.length > 0) {
    return edge.sources.map((source) => {
      const qualified = qualifiedBySourceId.get(source.sourceId);
      if (qualified && qualified.length === 1) {
        return qualified[0];
      }

      return source.id;
    });
  }

  return [UNATTRIBUTED_RULE_KEY];
}

export function buildSourcesRecord(
  sourceConnectionCounts: Map<string, number>,
  sourceMetaByQualified: Record<string, SourceMeta>,
): Record<string, ExportRule> {
  const sourcesRecord: Record<string, ExportRule> = {};

  for (const key of Array.from(sourceConnectionCounts.keys()).sort()) {
    sourcesRecord[key] = createExportRule(
      key,
      sourceConnectionCounts.get(key) ?? 0,
      sourceMetaByQualified[key],
    );
  }

  return sourcesRecord;
}

function createExportRule(
  key: string,
  connections: number,
  meta?: SourceMeta,
): ExportRule {
  const resolvedMeta = meta ?? getFallbackSourceMeta(key);

  return {
    name: resolvedMeta.name,
    plugin: resolvedMeta.plugin,
    connections,
  };
}

function getFallbackSourceMeta(key: string): SourceMeta {
  const [plugin, ...nameParts] = key.split(':');

  if (nameParts.length === 0) {
    return {
      name: key,
      plugin: 'unknown',
    };
  }

  return {
    name: nameParts.join(':'),
    plugin,
  };
}
