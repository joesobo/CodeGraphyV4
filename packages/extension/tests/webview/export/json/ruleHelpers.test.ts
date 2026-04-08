import { describe, expect, it } from 'vitest';
import { buildSourcesRecord, resolveSourceKeys } from '../../../../src/webview/export/json/sourceHelpers';
import { UNATTRIBUTED_RULE_KEY } from '../../../../src/webview/export/shared/contracts';

describe('exportJsonSourceHelpers', () => {
  describe('resolveSourceKeys', () => {
    it('returns explicit qualified source ids unchanged', () => {
      const qualifiedBySourceId = new Map<string, string[]>();

      expect(resolveSourceKeys({ sources: [{ id: 'ts:import', pluginId: 'ts', sourceId: 'import', label: 'Import' }] }, qualifiedBySourceId)).toEqual(['ts:import']);
    });

    it('resolves a source id when exactly one qualified match exists', () => {
      const qualifiedBySourceId = new Map<string, string[]>([['import', ['ts:import']]]);

      expect(resolveSourceKeys({ sources: [{ id: 'ts:whatever', pluginId: 'ts', sourceId: 'import', label: 'Import' }] }, qualifiedBySourceId)).toEqual(['ts:import']);
    });

    it('keeps a source id when lookup metadata is ambiguous', () => {
      const qualifiedBySourceId = new Map<string, string[]>([['import', ['ts:import', 'js:import']]]);

      expect(resolveSourceKeys({ sources: [{ id: 'ts:whatever', pluginId: 'ts', sourceId: 'import', label: 'Import' }] }, qualifiedBySourceId)).toEqual(['ts:whatever']);
    });

    it('falls back to the unattributed key when no source ids are present', () => {
      const qualifiedBySourceId = new Map<string, string[]>();

      expect(resolveSourceKeys({ sources: [] }, qualifiedBySourceId)).toEqual([UNATTRIBUTED_RULE_KEY]);
    });
  });

  describe('buildSourcesRecord', () => {
    it('sorts source keys and prefers plugin metadata when available', () => {
      const sourceConnectionCounts = new Map<string, number>([
        ['ts:dynamic', 1],
        ['ts:import', 2],
      ]);

      expect(buildSourcesRecord(sourceConnectionCounts, {
        'ts:import': { name: 'Import', plugin: 'TypeScript' },
        'ts:dynamic': { name: 'Dynamic', plugin: 'TypeScript' },
      })).toEqual({
        'ts:dynamic': { name: 'Dynamic', plugin: 'TypeScript', connections: 1 },
        'ts:import': { name: 'Import', plugin: 'TypeScript', connections: 2 },
      });
    });

    it('derives fallback name and plugin from qualified keys without metadata', () => {
      const sourceConnectionCounts = new Map<string, number>([['plugin:nested:source', 3]]);

      expect(buildSourcesRecord(sourceConnectionCounts, {})).toEqual({
        'plugin:nested:source': {
          name: 'nested:source',
          plugin: 'plugin',
          connections: 3,
        },
      });
    });

    it('uses an unknown plugin fallback for unqualified keys without metadata', () => {
      const sourceConnectionCounts = new Map<string, number>([['legacySource', 4]]);

      expect(buildSourcesRecord(sourceConnectionCounts, {})).toEqual({
        legacySource: {
          name: 'legacySource',
          plugin: 'unknown',
          connections: 4,
        },
      });
    });
  });
});
