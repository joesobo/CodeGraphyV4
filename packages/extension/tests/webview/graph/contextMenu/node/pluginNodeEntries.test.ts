import { describe, expect, it } from 'vitest';
import { buildSinglePluginNodeEntries } from '../../../../../src/webview/components/graph/contextMenu/node/pluginNodeEntries';

describe('graph/contextMenu/node/pluginNodeEntries', () => {
  it('builds the stable plugin runtime node action', () => {
    expect(buildSinglePluginNodeEntries()).toEqual([
      {
        action: { kind: 'builtin', action: 'focus' },
        id: 'node-focus',
        kind: 'item',
        label: 'Focus Node',
      },
    ]);
  });
});
