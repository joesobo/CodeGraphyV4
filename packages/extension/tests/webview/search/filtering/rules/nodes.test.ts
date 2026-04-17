import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../../../../src/shared/fileColors';
import { applyNodeLegendRules, getOrderedActiveRules } from '../../../../../src/webview/search/filtering/rules/nodes';

describe('search/filtering/rules/nodes', () => {
  it('returns a reversed copy of enabled rules without mutating the source list', () => {
    const legends = [
      { id: 'first', pattern: 'src/**', color: '#111111' },
      { id: 'disabled', pattern: 'src/**', color: '#222222', disabled: true },
      { id: 'last', pattern: 'src/App.ts', color: '#333333' },
    ];

    expect(getOrderedActiveRules(legends).map((rule) => rule.id)).toEqual(['last', 'first']);
    expect(legends.map((rule) => rule.id)).toEqual(['first', 'disabled', 'last']);
  });

  it('drops disabled rules and applies active rules from bottom to top', () => {
    const activeRules = getOrderedActiveRules([
      { id: 'specific', pattern: 'src/App.ts', color: '#00ff00', imageUrl: 'icon.png' },
      { id: 'disabled', pattern: 'src/**', color: '#999999', disabled: true },
      { id: 'typescript', pattern: 'src/**', color: '#ff0000', shape2D: 'diamond', shape3D: 'cube' },
    ]);

    expect(activeRules.map((rule) => rule.id)).toEqual(['typescript', 'specific']);
    expect(applyNodeLegendRules(
      { id: 'src/App.ts', label: 'App', color: '#111111' },
      activeRules,
    )).toMatchObject({
      color: '#00ff00',
      shape2D: 'diamond',
      shape3D: 'cube',
      imageUrl: 'icon.png',
    });
  });

  it('falls back to the default node color when the source node has no color', () => {
    expect(applyNodeLegendRules(
      { id: 'src/util.ts', label: 'utility', color: '' },
      [],
    ).color).toBe(DEFAULT_NODE_COLOR);
  });

  it('ignores edge-targeted and non-matching rules while treating missing targets as node rules', () => {
    expect(
      applyNodeLegendRules(
        { id: 'src/App.ts', label: 'App', color: '#111111' },
        [
          { id: 'edge', pattern: 'src/App.ts', color: '#ff0000', target: 'edge' },
          { id: 'miss', pattern: 'src/Other.ts', color: '#00ff00', imageUrl: 'miss.png' },
          { id: 'default-node', pattern: 'src/App.ts', color: '#123456' },
        ],
      ),
    ).toEqual({
      id: 'src/App.ts',
      label: 'App',
      color: '#123456',
    });
  });

  it('applies both-targeted rules to nodes and preserves existing image urls when later rules do not provide one', () => {
    expect(
      applyNodeLegendRules(
        { id: 'src/App.ts', label: 'App', color: '#111111' },
        [
          { id: 'shared', pattern: 'src/App.ts', color: '#abcdef', target: 'both', imageUrl: 'shared.png' },
          { id: 'override', pattern: 'src/App.ts', color: '#fedcba' },
        ],
      ),
    ).toEqual({
      id: 'src/App.ts',
      label: 'App',
      color: '#fedcba',
      imageUrl: 'shared.png',
    });
  });
});
