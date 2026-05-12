import { describe, expect, it } from 'vitest';
import { pruneGraphControlConfigMap } from '../../../src/shared/graphControls/settings';

describe('shared/graphControls/settings', () => {
  it('prunes stale symbol entries from node theme maps only', () => {
    expect(pruneGraphControlConfigMap('nodeColors', {
      symbol: '#8B5CF6',
      'symbol:function': '#8B5CF6',
      'symbol:method': '#A855F7',
      'symbol:namespace': '#64748B',
      'symbol:variable': '#14B8A6',
      file: '#111111',
    })).toEqual({
      'symbol:function': '#8B5CF6',
      file: '#111111',
    });
  });

  it('keeps the parent symbol visibility toggle while pruning removed child types', () => {
    expect(pruneGraphControlConfigMap('nodeVisibility', {
      symbol: true,
      'symbol:function': true,
      'symbol:method': true,
      'symbol:namespace': true,
      'symbol:variable': true,
      file: true,
    })).toEqual({
      symbol: true,
      'symbol:function': true,
      file: true,
    });
  });
});
