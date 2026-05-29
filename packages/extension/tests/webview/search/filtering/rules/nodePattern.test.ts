import { describe, expect, it } from 'vitest';
import { rulePatternMatchesNode } from '../../../../../src/webview/search/filtering/rules/nodePattern';

const symbolNode = {
  id: 'src/index.ts#buildGreeting:function',
  label: 'buildGreeting',
  color: '#111111',
  nodeType: 'symbol' as const,
  symbol: {
    id: 'src/index.ts#buildGreeting:function',
    filePath: 'src/index.ts',
    name: 'buildGreeting',
    kind: 'function',
    pluginKind: 'typescript-function',
  },
};

describe('search/filtering/rules/nodePattern', () => {
  it('matches node ids with the rule glob', () => {
    expect(rulePatternMatchesNode(symbolNode, {
      id: 'id',
      pattern: 'src/**/*.ts#*',
      color: '#111111',
    })).toBe(true);
  });

  it('lets custom rules match label and symbol metadata case-insensitively', () => {
    for (const pattern of ['BUILDGREETING', 'Function', 'typescript-*', '*.TS']) {
      expect(rulePatternMatchesNode(symbolNode, {
        id: pattern,
        pattern,
        color: '#111111',
      })).toBe(true);
    }
  });

  it('matches file-node labels without requiring symbol metadata', () => {
    expect(rulePatternMatchesNode({
      id: 'src/app.ts',
      label: 'App.ts',
      color: '#111111',
      nodeType: 'file',
    }, {
      id: 'file-label',
      pattern: 'app.TS',
      color: '#111111',
    })).toBe(true);
  });

  it('does not match symbol metadata for plugin default rules', () => {
    expect(rulePatternMatchesNode(symbolNode, {
      id: 'default',
      pattern: 'buildGreeting',
      color: '#111111',
      isPluginDefault: true,
    })).toBe(false);
  });
});
