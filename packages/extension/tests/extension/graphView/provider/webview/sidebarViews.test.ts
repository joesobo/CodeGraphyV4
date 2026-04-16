import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { getGraphViewProviderSidebarViews } from '../../../../../src/extension/graphView/provider/webview/sidebarViews';

describe('graphView/provider/webview/sidebarViews', () => {
  it('returns graph and timeline views in order', () => {
    const graphView = { id: 'graph-view' } as unknown as vscode.WebviewView;
    const timelineView = { id: 'timeline-view' } as unknown as vscode.WebviewView;

    expect(
      getGraphViewProviderSidebarViews({
        _view: graphView,
        _timelineView: timelineView,
      }),
    ).toEqual([graphView, timelineView]);
  });

  it('drops missing views', () => {
    const timelineView = { id: 'timeline-view' } as unknown as vscode.WebviewView;
    const graphView = { id: 'graph-view' } as unknown as vscode.WebviewView;

    expect(
      getGraphViewProviderSidebarViews({
        _view: undefined,
        _timelineView: timelineView,
      }),
    ).toEqual([timelineView]);
    expect(
      getGraphViewProviderSidebarViews({
        _view: graphView,
        _timelineView: undefined,
      }),
    ).toEqual([graphView]);
    expect(getGraphViewProviderSidebarViews({ _view: undefined, _timelineView: undefined })).toEqual([]);
  });
});
