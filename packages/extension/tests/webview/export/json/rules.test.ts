import { describe, expect, it } from 'vitest';
import type { IGraphEdge } from '../../../../src/shared/graph/types';
import type { IPluginStatus } from '../../../../src/shared/plugins/status';
import {
  buildConnectionData,
  buildSourceLookups,
  resolveSourceKeys,
} from '../../../../src/webview/export/json/sources';
import { UNATTRIBUTED_RULE_KEY } from '../../../../src/webview/export/shared/contracts';

describe('exportJsonSources', () => {
  const pluginStatuses: IPluginStatus[] = [
    {
      id: 'ts',
      name: 'TypeScript',
      version: '1.0.0',
      supportedExtensions: ['.ts'],
      status: 'active',
      enabled: true,
      connectionCount: 2,
      sources: [
        { id: 'import', qualifiedSourceId: 'ts:import', name: 'Import', description: '', enabled: true, connectionCount: 1 },
        { id: 'dynamic', qualifiedSourceId: 'ts:dynamic', name: 'Dynamic', description: '', enabled: true, connectionCount: 1 },
      ],
    },
    {
      id: 'js',
      name: 'JavaScript',
      version: '1.0.0',
      supportedExtensions: ['.js'],
      status: 'active',
      enabled: true,
      connectionCount: 1,
      sources: [
        { id: 'import', qualifiedSourceId: 'js:import', name: 'Import', description: '', enabled: true, connectionCount: 1 },
      ],
    },
  ];

  it('builds plugin source lookup tables', () => {
    const lookups = buildSourceLookups(pluginStatuses);

    expect(lookups.sourceMetaByQualified['ts:dynamic']).toEqual({
      name: 'Dynamic',
      plugin: 'TypeScript',
    });
    expect(lookups.qualifiedBySourceId.get('import')).toEqual(['ts:import', 'js:import']);
  });

  it('resolves source ids for explicit, unambiguous, ambiguous, and missing source metadata', () => {
    const lookups = buildSourceLookups(pluginStatuses);

    expect(resolveSourceKeys({ sources: [{ id: 'ts:dynamic', pluginId: 'ts', sourceId: 'dynamic', label: 'Dynamic' }] }, lookups.qualifiedBySourceId)).toEqual(['ts:dynamic']);
    expect(resolveSourceKeys({ sources: [{ id: 'ts:any', pluginId: 'ts', sourceId: 'dynamic', label: 'Dynamic' }] }, lookups.qualifiedBySourceId)).toEqual(['ts:dynamic']);
    expect(resolveSourceKeys({ sources: [{ id: 'ts:any', pluginId: 'ts', sourceId: 'import', label: 'Import' }] }, lookups.qualifiedBySourceId)).toEqual(['ts:any']);
    expect(resolveSourceKeys({ sources: [] }, lookups.qualifiedBySourceId)).toEqual([UNATTRIBUTED_RULE_KEY]);
  });

  it('builds grouped imports and sorted source records with fallback metadata', () => {
    const lookups = buildSourceLookups(pluginStatuses);
    const edges: IGraphEdge[] = [
      { id: '1', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [{ id: 'ts:any', pluginId: 'ts', sourceId: 'dynamic', label: 'Dynamic' }] },
      { id: '2', from: 'a.ts', to: 'c.ts', kind: 'import', sources: [{ id: 'unknown', pluginId: 'unknown', sourceId: 'unknown', label: 'unknown' }] },
      { id: '3', from: 'a.ts', to: 'd.ts' , kind: 'import', sources: [] },
    ];

    const result = buildConnectionData(edges, lookups);

    expect(result.importsMap.get('a.ts')).toEqual({
      'ts:dynamic': ['b.ts'],
      unknown: ['c.ts'],
      [UNATTRIBUTED_RULE_KEY]: ['d.ts'],
    });
    expect(Object.keys(result.sourcesRecord)).toEqual(['ts:dynamic', 'unknown']);
    expect(result.sourcesRecord['ts:dynamic']).toEqual({
      name: 'Dynamic',
      plugin: 'TypeScript',
      connections: 1,
    });
    expect(result.sourcesRecord.unknown).toEqual({
      name: 'unknown',
      plugin: 'unknown',
      connections: 1,
    });
  });
});
