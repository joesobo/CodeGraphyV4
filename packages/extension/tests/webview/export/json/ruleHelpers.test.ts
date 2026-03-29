import { describe, expect, it } from 'vitest';
import { buildRulesRecord, resolveRuleKeys } from '../../../../src/webview/export/json/ruleHelpers';
import { UNATTRIBUTED_RULE_KEY } from '../../../../src/webview/export/shared/contracts';

describe('exportJsonRuleHelpers', () => {
  describe('resolveRuleKeys', () => {
    it('returns explicit qualified rule ids unchanged', () => {
      const qualifiedByRuleId = new Map<string, string[]>();

      expect(resolveRuleKeys({ ruleIds: ['ts:import'] }, qualifiedByRuleId)).toEqual(['ts:import']);
    });

    it('resolves a legacy rule id when exactly one qualified match exists', () => {
      const qualifiedByRuleId = new Map<string, string[]>([['import', ['ts:import']]]);

      expect(resolveRuleKeys({ ruleId: 'import' }, qualifiedByRuleId)).toEqual(['ts:import']);
    });

    it('keeps a legacy rule id when lookup metadata is ambiguous', () => {
      const qualifiedByRuleId = new Map<string, string[]>([['import', ['ts:import', 'js:import']]]);

      expect(resolveRuleKeys({ ruleId: 'import' }, qualifiedByRuleId)).toEqual(['import']);
    });

    it('falls back to the unattributed key when no rule ids are present', () => {
      const qualifiedByRuleId = new Map<string, string[]>();

      expect(resolveRuleKeys({}, qualifiedByRuleId)).toEqual([UNATTRIBUTED_RULE_KEY]);
    });
  });

  describe('buildRulesRecord', () => {
    it('sorts rule keys and prefers plugin metadata when available', () => {
      const ruleConnectionCounts = new Map<string, number>([
        ['ts:dynamic', 1],
        ['ts:import', 2],
      ]);

      expect(buildRulesRecord(ruleConnectionCounts, {
        'ts:import': { name: 'Import', plugin: 'TypeScript' },
        'ts:dynamic': { name: 'Dynamic', plugin: 'TypeScript' },
      })).toEqual({
        'ts:dynamic': { name: 'Dynamic', plugin: 'TypeScript', connections: 1 },
        'ts:import': { name: 'Import', plugin: 'TypeScript', connections: 2 },
      });
    });

    it('derives fallback name and plugin from qualified keys without metadata', () => {
      const ruleConnectionCounts = new Map<string, number>([['plugin:nested:rule', 3]]);

      expect(buildRulesRecord(ruleConnectionCounts, {})).toEqual({
        'plugin:nested:rule': {
          name: 'nested:rule',
          plugin: 'plugin',
          connections: 3,
        },
      });
    });

    it('uses an unknown plugin fallback for unqualified keys without metadata', () => {
      const ruleConnectionCounts = new Map<string, number>([['legacyRule', 4]]);

      expect(buildRulesRecord(ruleConnectionCounts, {})).toEqual({
        legacyRule: {
          name: 'legacyRule',
          plugin: 'unknown',
          connections: 4,
        },
      });
    });
  });
});
