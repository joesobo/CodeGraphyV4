import { describe, expect, it } from 'vitest';
import { resolveProjectedGraphNodeTypes } from '../../../src/workspace/graphScopeProjection/model';
import {
  ENGINE_PLUGIN_NODE_TYPES,
  GODOT_NODE_TYPES,
} from '../../fixtures/enginePluginNodeTypes';

describe('workspace graph scope projection', () => {
  it('adds parent and overlapping Core Node Types for a requested child', () => {
    expect(new Set(resolveProjectedGraphNodeTypes(['symbol:function']))).toEqual(new Set([
      'symbol',
      'symbol:function',
      'symbol:callable',
      'symbol:method',
    ]));
  });

  it('adds all parents in a nested Node Type hierarchy', () => {
    expect(new Set(resolveProjectedGraphNodeTypes(['symbol:constant']))).toEqual(new Set([
      'symbol',
      'variable',
      'symbol:constant',
    ]));
  });

  it('adds a Core type when any requested symbol kind overlaps', () => {
    expect(new Set(resolveProjectedGraphNodeTypes(['symbol:callable']))).toEqual(new Set([
      'symbol',
      'symbol:callable',
      'symbol:function',
    ]));
  });

  it('does not broaden plugin Node Types to Core types with the same symbol kind', () => {
    expect(new Set(resolveProjectedGraphNodeTypes([
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
    ], GODOT_NODE_TYPES))).toEqual(new Set([
      'symbol',
      'variable',
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
    ]));
  });

  it('preserves unknown Node Types without adding parents', () => {
    expect(resolveProjectedGraphNodeTypes(['plugin:example:custom'])).toEqual([
      'plugin:example:custom',
    ]);
  });

  it('adds descendants needed to evaluate a parent Node Type projection', () => {
    const symbolTypes = resolveProjectedGraphNodeTypes(['symbol'], ENGINE_PLUGIN_NODE_TYPES);
    const variableTypes = resolveProjectedGraphNodeTypes(['variable']);

    expect(symbolTypes).toEqual(expect.arrayContaining([
      'symbol:function',
      'symbol:constant',
      'plugin:codegraphy.unity:symbol',
    ]));
    expect(variableTypes).toEqual(expect.arrayContaining([
      'variable:plain',
      'symbol:constant',
      'symbol:field',
    ]));
    expect(variableTypes).not.toContain('symbol:function');
  });
});
