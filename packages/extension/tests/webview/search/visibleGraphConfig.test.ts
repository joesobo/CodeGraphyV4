import { describe, expect, it } from 'vitest';
import { buildVisibleGraphConfig } from '../../../src/webview/search/visibleGraphConfig';

describe('webview/search/visibleGraphConfig', () => {
  it('builds visible graph config without feature-specific collapse state', () => {
    expect(buildVisibleGraphConfig({
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      searchQuery: '',
      showOrphans: true,
    })).toEqual({
      collapse: undefined,
      filter: undefined,
      scope: { edges: [], nodes: [] },
      search: undefined,
      showOrphans: true,
    });
  });
});
