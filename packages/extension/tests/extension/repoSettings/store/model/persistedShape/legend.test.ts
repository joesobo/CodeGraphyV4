import { describe, expect, it } from 'vitest';
import { normalizePersistedSettingsShape } from '../../../../../../src/extension/repoSettings/store/model/persistedShape';

describe('extension/repoSettings persisted legend shape', () => {
  it('keeps explicit legend and node color settings only', () => {
    expect(normalizePersistedSettingsShape({
      legend: [{ id: 'legend-1', pattern: 'tests/**', color: '#abcdef' }],
      nodeColors: { folder: '#654321', file: '#111111' },
      unknownNested: { value: true },
    })).toEqual({
      legend: [{ id: 'legend-1', pattern: 'tests/**', color: '#abcdef' }],
      nodeColors: { folder: '#654321', file: '#111111' },
    });
  });


  it('prunes stale symbol theme keys while preserving the symbol visibility toggle', () => {
    expect(normalizePersistedSettingsShape({
      nodeColors: {
        symbol: '#8B5CF6',
        'symbol:function': '#8B5CF6',
        'symbol:method': '#A855F7',
        'symbol:namespace': '#64748B',
        'symbol:variable': '#14B8A6',
        file: '#111111',
      },
      nodeVisibility: {
        symbol: true,
        'symbol:function': true,
        'symbol:method': true,
        'symbol:namespace': true,
        'symbol:variable': true,
        file: true,
      },
    })).toEqual({
      nodeColors: {
        symbol: '#8B5CF6',
        'symbol:function': '#8B5CF6',
        'symbol:method': '#A855F7',
        'symbol:namespace': '#64748B',
        file: '#111111',
      },
      nodeVisibility: {
        symbol: true,
        'symbol:function': true,
        'symbol:method': true,
        'symbol:namespace': true,
        file: true,
      },
    });
  });


  it('adds runtime ids to persisted legend rules that omit them', () => {
    expect(normalizePersistedSettingsShape({
      legend: [
        { pattern: 'src/**', color: '#abcdef' },
        { id: 'custom-id', pattern: 'import', color: '#123456', target: 'edge' },
      ],
    })).toEqual({
      legend: [
        { id: 'legend:node:src:1', pattern: 'src/**', color: '#abcdef' },
        { id: 'custom-id', pattern: 'import', color: '#123456', target: 'edge' },
      ],
    });
  });


  it('creates stable legend ids from target and sanitized pattern fallbacks', () => {
    expect(normalizePersistedSettingsShape({
      legend: [
        { pattern: 'Src Components/**/*.tsx', color: '#abcdef', target: 'edge' },
        { pattern: '', color: '#123456', target: '' },
        { pattern: '!!!', color: '#654321' },
        { pattern: 'A'.repeat(60), color: '#fedcba' },
        { id: '', pattern: 'tests/**', color: '#111111' },
        { pattern: 42, color: '#222222' },
        { pattern: '---Src---', color: '#333333' },
        { pattern: { length: 1 }, color: '#444444' },
        'not a rule',
      ],
    })).toEqual({
      legend: [
        { id: 'legend:edge:src-components-tsx:1', pattern: 'Src Components/**/*.tsx', color: '#abcdef', target: 'edge' },
        { id: 'legend:node:rule-2:2', pattern: '', color: '#123456', target: '' },
        { id: 'legend:node:rule-3:3', pattern: '!!!', color: '#654321' },
        { id: `legend:node:${'a'.repeat(48)}:4`, pattern: 'A'.repeat(60), color: '#fedcba' },
        { id: 'legend:node:tests:5', pattern: 'tests/**', color: '#111111' },
        { id: 'legend:node:rule-6:6', pattern: 42, color: '#222222' },
        { id: 'legend:node:src:7', pattern: '---Src---', color: '#333333' },
        { id: 'legend:node:rule-8:8', pattern: { length: 1 }, color: '#444444' },
      ],
    });
  });


  it('normalizes non-array legend settings to an empty legend list', () => {
    expect(normalizePersistedSettingsShape({
      legend: { pattern: 'src/**', color: '#abcdef' },
    })).toEqual({
      legend: [],
    });
  });

});
