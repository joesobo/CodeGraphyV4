import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { getGraphViewProviderSidebarViews } from '../../../../../src/extension/graphView/provider/webview/sidebarViews';

describe('graphView/provider/webview/sidebarViews', () => {
  it('returns search, graph, and timeline views in order', () => {
    const searchView = { id: 'search-view' } as unknown as vscode.WebviewView;
    const graphView = { id: 'graph-view' } as unknown as vscode.WebviewView;
    const timelineView = { id: 'timeline-view' } as unknown as vscode.WebviewView;

    expect(
      getGraphViewProviderSidebarViews({
        _searchView: searchView,
        _view: graphView,
        _timelineView: timelineView,
      }),
    ).toEqual([searchView, graphView, timelineView]);
  });

  it('drops missing views', () => {
    const searchView = { id: 'search-view' } as unknown as vscode.WebviewView;
    const timelineView = { id: 'timeline-view' } as unknown as vscode.WebviewView;
    const graphView = { id: 'graph-view' } as unknown as vscode.WebviewView;

    expect(
      getGraphViewProviderSidebarViews({
        _searchView: undefined,
        _view: undefined,
        _timelineView: timelineView,
      }),
    ).toEqual([timelineView]);
    expect(
      getGraphViewProviderSidebarViews({
        _searchView: undefined,
        _view: graphView,
        _timelineView: undefined,
      }),
    ).toEqual([graphView]);
    expect(
      getGraphViewProviderSidebarViews({
        _searchView: searchView,
        _view: undefined,
        _timelineView: undefined,
      }),
    ).toEqual([searchView]);
    expect(
      getGraphViewProviderSidebarViews({
        _searchView: undefined,
        _view: undefined,
        _timelineView: undefined,
      }),
    ).toEqual([]);
  });
});
