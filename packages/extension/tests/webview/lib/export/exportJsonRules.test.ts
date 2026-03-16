import { describe, expect, it } from 'vitest';
import type { IGraphEdge, IPluginStatus } from '../../../../src/shared/types';
import {
  buildConnectionData,
  buildRuleLookups,
  resolveRuleKeys,
} from '../../../../src/webview/lib/export/exportJsonRules';
import { UNATTRIBUTED_RULE_KEY } from '../../../../src/webview/lib/export/exportTypes';

describe('exportJsonRules', () => {
  const pluginStatuses: IPluginStatus[] = [
    {
      id: 'ts',
      name: 'TypeScript',
      version: '1.0.0',
      supportedExtensions: ['.ts'],
      status: 'active',
      enabled: true,
      connectionCount: 2,
      rules: [
        { id: 'import', qualifiedId: 'ts:import', name: 'Import', description: '', enabled: true, connectionCount: 1 },
        { id: 'dynamic', qualifiedId: 'ts:dynamic', name: 'Dynamic', description: '', enabled: true, connectionCount: 1 },
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
      rules: [
        { id: 'import', qualifiedId: 'js:import', name: 'Import', description: '', enabled: true, connectionCount: 1 },
      ],
    },
  ];

  it('builds plugin rule lookup tables', () => {
    const lookups = buildRuleLookups(pluginStatuses);

    expect(lookups.ruleMetaByQualified['ts:dynamic']).toEqual({
      name: 'Dynamic',
      plugin: 'TypeScript',
    });
    expect(lookups.qualifiedByRuleId.get('import')).toEqual(['ts:import', 'js:import']);
  });

  it('resolves rule ids for explicit, unambiguous, ambiguous, and missing rule metadata', () => {
    const lookups = buildRuleLookups(pluginStatuses);

    expect(resolveRuleKeys({ ruleIds: ['ts:dynamic'] }, lookups.qualifiedByRuleId)).toEqual(['ts:dynamic']);
    expect(resolveRuleKeys({ ruleId: 'dynamic' }, lookups.qualifiedByRuleId)).toEqual(['ts:dynamic']);
    expect(resolveRuleKeys({ ruleId: 'import' }, lookups.qualifiedByRuleId)).toEqual(['import']);
    expect(resolveRuleKeys({}, lookups.qualifiedByRuleId)).toEqual([UNATTRIBUTED_RULE_KEY]);
  });

  it('builds grouped imports and sorted rule records with fallback metadata', () => {
    const lookups = buildRuleLookups(pluginStatuses);
    const edges: IGraphEdge[] = [
      { id: '1', from: 'a.ts', to: 'b.ts', ruleId: 'dynamic' },
      { id: '2', from: 'a.ts', to: 'c.ts', ruleId: 'unknown' },
      { id: '3', from: 'a.ts', to: 'd.ts' },
    ];

    const result = buildConnectionData(edges, lookups);

    expect(result.importsMap.get('a.ts')).toEqual({
      'ts:dynamic': ['b.ts'],
      unknown: ['c.ts'],
      [UNATTRIBUTED_RULE_KEY]: ['d.ts'],
    });
    expect(Object.keys(result.rulesRecord)).toEqual(['ts:dynamic', 'unknown']);
    expect(result.rulesRecord['ts:dynamic']).toEqual({
      name: 'Dynamic',
      plugin: 'TypeScript',
      connections: 1,
    });
    expect(result.rulesRecord.unknown).toEqual({
      name: 'unknown',
      plugin: 'unknown',
      connections: 1,
    });
  });
});
