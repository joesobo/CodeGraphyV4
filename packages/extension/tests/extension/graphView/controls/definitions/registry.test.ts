import { describe, expect, it } from 'vitest';
import {
  readEdgeTypes,
  readNodeTypes,
  readRegistryDefinitions,
} from '../../../../../src/extension/graphView/controls/send/definitions/registry';

describe('extension/graphView/controls/registry', () => {
  it('returns an empty list without throwing when the registry is missing or malformed', () => {
    expect(readNodeTypes(undefined)).toEqual([]);
    expect(readEdgeTypes(null)).toEqual([]);
    expect(readNodeTypes('not-an-object')).toEqual([]);
    expect(
      readNodeTypes(
        Object.assign(() => undefined, {
          listNodeTypes: () => [{ id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true }],
        }),
      ),
    ).toEqual([]);

    expect(() =>
      readNodeTypes({
        listNodeTypes: 'not-a-function',
      }),
    ).not.toThrow();
    expect(
      readNodeTypes({
        listNodeTypes: 'not-a-function',
      }),
    ).toEqual([]);

    expect(() =>
      readEdgeTypes({
        listEdgeTypes: () => 'not-an-array',
      }),
    ).not.toThrow();
    expect(
      readEdgeTypes({
        listEdgeTypes: () => 'not-an-array',
      }),
    ).toEqual([]);
  });

  it('calls registry reader methods with the registry as this and without arguments', () => {
    const registry = {
      listNodeTypes(this: unknown, ...args: unknown[]) {
        expect(this).toBe(registry);
        expect(args).toEqual([]);
        return [{ id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true }];
      },
    };

    expect(readNodeTypes(registry)).toEqual([
      { id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true },
    ]);
  });

  it('reads node and edge definitions from their matching registry methods', () => {
    expect(
      readNodeTypes({
        listNodeTypes: () => [{ id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true }],
        listEdgeTypes: () => [{ id: 'wrong', label: 'Wrong', defaultColor: '#F97316', defaultVisible: true }],
      }),
    ).toEqual([
      { id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true },
    ]);

    expect(
      readEdgeTypes({
        listNodeTypes: () => [{ id: 'wrong', label: 'Wrong', defaultColor: '#22C55E', defaultVisible: true }],
        listEdgeTypes: () => [{ id: 'plugin:route', label: 'Route', defaultColor: '#F97316', defaultVisible: true }],
      }),
    ).toEqual([
      { id: 'plugin:route', label: 'Route', defaultColor: '#F97316', defaultVisible: true },
    ]);
  });

  it('filters registry definitions through the provided type guard', () => {
    const definitions = readRegistryDefinitions(
      {
        listNodeTypes: () => [
          null,
          { id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true },
          { id: 'bad-node', label: 'Bad Node', defaultColor: '#22C55E', defaultVisible: 'yes' },
        ],
      },
      'listNodeTypes',
      (
        definition,
      ): definition is { id: string; label: string; defaultColor: string; defaultVisible: boolean } =>
        Boolean(
          definition
          && typeof definition === 'object'
          && typeof (definition as Record<string, unknown>).id === 'string'
          && typeof (definition as Record<string, unknown>).label === 'string'
          && typeof (definition as Record<string, unknown>).defaultColor === 'string'
          && typeof (definition as Record<string, unknown>).defaultVisible === 'boolean',
        ),
    );

    expect(definitions).toEqual([
      { id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true },
    ]);
  });
});
