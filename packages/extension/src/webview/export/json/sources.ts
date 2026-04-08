import type { IGraphEdge } from '../../../shared/graph/types';
import type { IPluginStatus } from '../../../shared/plugins/status';
import { UNATTRIBUTED_RULE_KEY, type ExportRule } from '../shared/contracts';
import {
  buildSourcesRecord,
  resolveSourceKeys as resolveSourceKeysHelper,
  type SourceMeta,
} from './sourceHelpers';

export interface ExportSourceLookups {
  sourceMetaByQualified: Record<string, SourceMeta>;
  qualifiedBySourceId: Map<string, string[]>;
}

export interface ExportConnectionData {
  importsMap: Map<string, Record<string, string[]>>;
  sourcesRecord: Record<string, ExportRule>;
}

export const resolveSourceKeys = resolveSourceKeysHelper;

export function buildSourceLookups(pluginStatuses: IPluginStatus[] = []): ExportSourceLookups {
  const sourceMetaByQualified: Record<string, SourceMeta> = {};
  const qualifiedBySourceId = new Map<string, string[]>();

  for (const plugin of pluginStatuses) {
    for (const source of plugin.sources) {
      sourceMetaByQualified[source.qualifiedSourceId] = {
        name: source.name,
        plugin: plugin.name,
      };

      const qualifiedSourceIds = qualifiedBySourceId.get(source.id);
      if (qualifiedSourceIds) {
        qualifiedSourceIds.push(source.qualifiedSourceId);
      } else {
        qualifiedBySourceId.set(source.id, [source.qualifiedSourceId]);
      }
    }
  }

  return {
    sourceMetaByQualified,
    qualifiedBySourceId,
  };
}

export function buildConnectionData(
  edges: IGraphEdge[],
  lookups: ExportSourceLookups,
): ExportConnectionData {
  const importsMap = new Map<string, Record<string, string[]>>();
  const sourceConnectionCounts = new Map<string, number>();

  for (const edge of edges) {
    const sourceKeys = resolveSourceKeys(edge, lookups.qualifiedBySourceId);
    let fileImports = importsMap.get(edge.from);

    if (!fileImports) {
      fileImports = {};
      importsMap.set(edge.from, fileImports);
    }

    for (const key of sourceKeys) {
      if (!fileImports[key]) {
        fileImports[key] = [];
      }

      fileImports[key].push(edge.to);

      if (key !== UNATTRIBUTED_RULE_KEY) {
        sourceConnectionCounts.set(key, (sourceConnectionCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return {
    importsMap,
    sourcesRecord: buildSourcesRecord(sourceConnectionCounts, lookups.sourceMetaByQualified),
  };
}
