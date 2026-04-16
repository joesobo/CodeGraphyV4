import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../../../../src/shared/fileColors';
import { applyNodeLegendRules, getOrderedActiveRules } from '../../../../../src/webview/search/filtering/rules/nodeRules';

describe('search/filtering/rules/nodeRules', () => {
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
});
