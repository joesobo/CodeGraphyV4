import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import {
  replaceCustomEdgeRules,
  upsertEdgeTypeColorRule,
} from '../../../../../src/webview/components/legends/panel/state/edgeRules';

describe('webview/legends/panel/state/edgeRules', () => {
  it('adds a new edge type color rule when none exists', () => {
    const rules: IGroup[] = [
      { id: 'node-rule', pattern: 'src/**', color: '#123456', target: 'node' },
    ];

    expect(upsertEdgeTypeColorRule(rules, 'import', '#abcdef')).toEqual([
      { id: 'node-rule', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'legend:edge:import', pattern: 'import', color: '#abcdef', target: 'edge' },
    ]);
  });

  it('updates an existing edge type color rule without replacing node rules with the same pattern', () => {
    const rules: IGroup[] = [
      { id: 'node-import', pattern: 'import', color: '#111111', target: 'node' },
      {
        id: 'custom-import',
        pattern: 'import',
        color: '#222222',
        target: 'edge',
        disabled: true,
      },
    ];

    expect(upsertEdgeTypeColorRule(rules, 'import', '#abcdef')).toEqual([
      { id: 'node-import', pattern: 'import', color: '#111111', target: 'node' },
      {
        id: 'custom-import',
        pattern: 'import',
        color: '#abcdef',
        target: 'edge',
        disabled: true,
      },
    ]);
  });

  it('updates an existing edge type color rule at the first position', () => {
    const rules: IGroup[] = [
      { id: 'custom-import', pattern: 'import', color: '#222222', target: 'edge' },
      { id: 'node-rule', pattern: 'src/**', color: '#111111', target: 'node' },
    ];

    expect(upsertEdgeTypeColorRule(rules, 'import', '#abcdef')).toEqual([
      { id: 'custom-import', pattern: 'import', color: '#abcdef', target: 'edge' },
      { id: 'node-rule', pattern: 'src/**', color: '#111111', target: 'node' },
    ]);
  });

  it('does not replace a different edge type color rule', () => {
    const rules: IGroup[] = [
      { id: 'custom-export', pattern: 'export', color: '#222222', target: 'edge' },
    ];

    expect(upsertEdgeTypeColorRule(rules, 'import', '#abcdef')).toEqual([
      { id: 'custom-export', pattern: 'export', color: '#222222', target: 'edge' },
      { id: 'legend:edge:import', pattern: 'import', color: '#abcdef', target: 'edge' },
    ]);
  });

  it('replaces custom edge section rules while preserving node and built-in edge color rules', () => {
    const rules: IGroup[] = [
      { id: 'node-rule', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'edge-color', pattern: 'import', color: '#abcdef', target: 'edge' },
      { id: 'edge-section', pattern: 'src/**', color: '#654321', target: 'edge' },
    ];
    const nextSectionRules: IGroup[] = [
      { id: 'edge-next', pattern: 'tests/**', color: '#f97316', target: 'edge' },
    ];

    expect(replaceCustomEdgeRules(
      rules,
      new Set(['import']),
      nextSectionRules,
    )).toEqual([
      { id: 'node-rule', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'edge-color', pattern: 'import', color: '#abcdef', target: 'edge' },
      { id: 'edge-next', pattern: 'tests/**', color: '#f97316', target: 'edge' },
    ]);
  });
});
