import { describe, expect, it } from 'vitest';
import { buildVisibleGraphConfig } from '../../../src/webview/search/visibleGraphConfig';

describe('webview/search/visibleGraphConfig', () => {
  it('maps graph layout collapsed nodes into visible graph collapse config', () => {
    expect(buildVisibleGraphConfig({
      graphLayout: { collapsedNodes: { src: true, tests: false } },
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      searchQuery: '',
      showOrphans: true,
    })).toMatchObject({
      collapse: { collapsedNodeIds: ['src'] },
    });
  });
});
