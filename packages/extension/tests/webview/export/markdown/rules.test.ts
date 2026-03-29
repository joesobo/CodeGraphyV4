import { describe, expect, it } from 'vitest';
import { renderMarkdownRulesSection } from '../../../../src/webview/export/markdown/rules';

describe('exportMarkdownRules', () => {
  it('returns no lines when there are no rule summaries', () => {
    expect(renderMarkdownRulesSection({})).toEqual([]);
  });

  it('renders rule summaries in markdown bullet format', () => {
    expect(renderMarkdownRulesSection({
      'ts:import': {
        name: 'Import',
        plugin: 'TypeScript',
        connections: 2,
      },
    })).toEqual([
      '### Rules',
      '',
      '- **Import** (`ts:import`, TypeScript) - 2 connections',
      '',
    ]);
  });
});
