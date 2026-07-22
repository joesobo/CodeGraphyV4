import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { getGraphViewProviderSidebarViews } from '../../../../../src/extension/graphView/provider/webview/sidebarViews';

describe('graphView/provider/webview/sidebarViews', () => {
  it('returns the graph sidebar view when resolved', () => {
    const graphView = { id: 'graph-view' } as unknown as vscode.WebviewView;

    expect(getGraphViewProviderSidebarViews({ _view: graphView })).toEqual([graphView]);
  });

  it('returns no sidebar views before the graph resolves', () => {
    expect(getGraphViewProviderSidebarViews({ _view: undefined })).toEqual([]);
  });
});
