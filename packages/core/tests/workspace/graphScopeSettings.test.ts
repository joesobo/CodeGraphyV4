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

  it('forces plugin-scoped declarations to default hidden until manually enabled', () => {
    const scope = resolveSavedGraphScope({}, undefined, {
      nodes: [{ id: 'plugin:route', defaultVisible: true }],
      edges: [{ id: 'codegraphy.route:route-link', defaultVisible: true }],
    });

    expect(scope.nodes['plugin:route']).toBe(false);
    expect(scope.edges['codegraphy.route:route-link']).toBe(false);
  });

  it('keeps manually enabled plugin scope entries enabled', () => {
    const scope = resolveSavedGraphScope({
      nodeVisibility: { 'plugin:codegraphy.unity:symbol:game-object': true },
      edgeVisibility: { 'codegraphy.gdscript:signal-connection': true },
    }, undefined, {
      nodes: [{ id: 'plugin:codegraphy.unity:symbol:game-object', defaultVisible: false }],
    });

    expect(scope.nodes['plugin:codegraphy.unity:symbol:game-object']).toBe(true);
    expect(scope.edges['codegraphy.gdscript:signal-connection']).toBe(true);
  });

  it('defaults unknown plugin-namespaced edge kinds from graph data to hidden', () => {
    const scope = resolveSavedGraphScope({}, {
      nodes: [],
      edges: [
        { id: 'a', from: 'x', to: 'y', kind: 'custom-kind', sources: [] },
        { id: 'b', from: 'x', to: 'y', kind: 'codegraphy.unity:event-link', sources: [] },
      ],
    } as never);

    expect(scope.edges['custom-kind']).toBe(true);
    expect(scope.edges['codegraphy.unity:event-link']).toBe(false);
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
