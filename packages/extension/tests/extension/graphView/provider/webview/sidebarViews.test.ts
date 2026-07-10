import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { getGraphViewProviderSidebarViews } from '../../../../../src/extension/graphView/provider/webview/sidebarViews';

describe('graphView/provider/webview/sidebarViews', () => {

  it('drops missing views', () => {
    const graphView = { id: 'graph-view' } as unknown as vscode.WebviewView;

    expect(
      getGraphViewProviderSidebarViews({
        _view: undefined,
      }),
    ).toEqual([]);
    expect(
      getGraphViewProviderSidebarViews({
        _view: graphView,
      }),
    ).toEqual([graphView]);
    expect(getGraphViewProviderSidebarViews({ _view: undefined, })).toEqual([]);
  });
});
