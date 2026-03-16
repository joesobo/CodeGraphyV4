import { describe, expect, it } from 'vitest';
import {
  getBackgroundClickCommand,
  getLinkClickCommand,
} from '../../src/webview/components/graphInteraction/surfaceClick';

describe('graphInteraction surface click', () => {
  it('opens the background context menu for mac control-click', () => {
    expect(getBackgroundClickCommand({ ctrlKey: true, isMacPlatform: true })).toEqual([
      { kind: 'openBackgroundContextMenu' },
    ]);
  });

  it('clears the selection on a normal background click', () => {
    expect(getBackgroundClickCommand({ ctrlKey: false, isMacPlatform: false })).toEqual([
      { kind: 'clearSelection' },
      { kind: 'sendInteraction', event: 'graph:backgroundClick', payload: {} },
    ]);
  });

  it('treats ctrl-click as a normal background click on non-mac platforms', () => {
    expect(getBackgroundClickCommand({ ctrlKey: true, isMacPlatform: false })).toEqual([
      { kind: 'clearSelection' },
      { kind: 'sendInteraction', event: 'graph:backgroundClick', payload: {} },
    ]);
  });

  it('opens the edge context menu for mac control-click', () => {
    expect(getLinkClickCommand({ ctrlKey: true, isMacPlatform: true })).toEqual([
      { kind: 'openEdgeContextMenu' },
    ]);
  });

  it('ignores normal link clicks', () => {
    expect(getLinkClickCommand({ ctrlKey: false, isMacPlatform: false })).toEqual([]);
  });

  it('ignores ctrl-click link clicks on non-mac platforms', () => {
    expect(getLinkClickCommand({ ctrlKey: true, isMacPlatform: false })).toEqual([]);
  });
});
