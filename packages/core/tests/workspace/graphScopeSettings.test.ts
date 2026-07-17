import { describe, expect, it } from 'vitest';
import { resolveSavedGraphScope } from '../../src/workspace/graphScopeSettings';

describe('workspace graph scope settings', () => {
  it('uses the same Core edge defaults as the extension', () => {
    const scope = resolveSavedGraphScope({});

    expect(scope.edges).toMatchObject({
      include: true,
      import: true,
      using: true,
      nests: true,
      call: false,
      contains: false,
      event: false,
      implements: false,
      inherit: false,
      load: false,
      overrides: false,
      reference: false,
      type: false,
      'type-import': false,
    });
  });

  it('respects declared plugin defaults before saved overrides', () => {
    const scope = resolveSavedGraphScope({}, undefined, {
      nodes: [{ id: 'plugin:route', defaultVisible: true }],
      edges: [{ id: 'plugin:route-link', defaultVisible: false }],
    });

    expect(scope.nodes['plugin:route']).toBe(true);
    expect(scope.edges['plugin:route-link']).toBe(false);
  });

  it('never lets derived overlap or parent enablement override an explicit off', () => {
    const overlapOff = resolveSavedGraphScope({
      nodeVisibility: { 'symbol:function': true, 'symbol:callable': false },
    });
    const parentOff = resolveSavedGraphScope({
      nodeVisibility: { 'symbol:function': true, symbol: false },
    });

    expect(overlapOff.nodes['symbol:callable']).toBe(false);
    expect(parentOff.nodes.symbol).toBe(false);
  });
});
