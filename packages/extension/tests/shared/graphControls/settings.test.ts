import { describe, expect, it } from 'vitest';
import { pruneGraphControlConfigMap } from '../../../src/shared/graphControls/settings';

describe('shared/graphControls/settings', () => {
  it('keeps supported symbol colors while pruning removed child types', () => {
    expect(pruneGraphControlConfigMap('nodeColors', {
      symbol: '#8B5CF6',
      'symbol:function': '#8B5CF6',
      'symbol:method': '#A855F7',
      'symbol:namespace': '#64748B',
      'symbol:property': '#84CC16',
      'symbol:variable': '#14B8A6',
      file: '#111111',
    })).toEqual({
      symbol: '#8B5CF6',
      'symbol:function': '#8B5CF6',
      'symbol:method': '#A855F7',
      'symbol:namespace': '#64748B',
      'symbol:property': '#84CC16',
      file: '#111111',
    });
  });

  it('keeps supported symbol visibility toggles while pruning removed child types', () => {
    expect(pruneGraphControlConfigMap('nodeVisibility', {
      symbol: true,
      'symbol:function': true,
      'symbol:method': true,
      'symbol:namespace': true,
      'symbol:property': true,
      'symbol:variable': true,
      file: true,
    })).toEqual({
      symbol: true,
      'symbol:function': true,
      'symbol:method': true,
      'symbol:namespace': true,
      'symbol:property': true,
      file: true,
    });
  });
});
