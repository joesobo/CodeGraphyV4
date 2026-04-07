import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ViewRegistry } from '../../../src/core/views/registry';
import type { IViewContext } from '../../../src/core/views/contracts';
import type { IViewInfo } from '../../../src/core/views/contracts';
import type { IGraphData } from '../../../src/shared/graph/types';
import {
  applyGraphViewTransform,
  getRelativeWorkspacePath,
  mapAvailableViews,
} from '../../../src/extension/graphView/presentation';

const rawGraphData: IGraphData = {
  nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
  edges: [],
};

const rawGraphWithPackageData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#ffffff' },
    { id: 'pkg:fs', label: 'fs', color: '#F59E0B', nodeType: 'package', shape2D: 'hexagon', shape3D: 'cube' },
  ],
  edges: [
    {
      id: 'src/app.ts->pkg:fs#import',
      from: 'src/app.ts',
      to: 'pkg:fs',
      kind: 'import',
      sources: [],
    },
  ],
};

const viewContext: IViewContext = {
  activePlugins: new Set<string>(),
};

describe('graphViewPresentation', () => {
  it('returns undefined for relative paths when no workspace is open', () => {
    const asRelativePath = vi.fn();
    const result = getRelativeWorkspacePath(
      vscode.Uri.file('/test/workspace/src/app.ts'),
      undefined,
      asRelativePath
    );

    expect(result).toBeUndefined();
    expect(asRelativePath).not.toHaveBeenCalled();
  });

  it('returns the workspace-relative path when it differs from the file system path', () => {
    const uri = vscode.Uri.file('/test/workspace/src/app.ts');
    const asRelativePath = vi.fn(() => 'src/app.ts');

    const result = getRelativeWorkspacePath(
      uri,
      [{ uri: vscode.Uri.file('/test/workspace') }],
      asRelativePath
    );

    expect(result).toBe('src/app.ts');
    expect(asRelativePath).toHaveBeenCalledWith(uri, false);
  });

  it('returns undefined when VS Code does not produce a relative path', () => {
    const uri = vscode.Uri.file('/test/workspace/src/app.ts');

    const result = getRelativeWorkspacePath(
      uri,
      [{ uri: vscode.Uri.file('/test/workspace') }],
      vi.fn(() => uri.fsPath)
    );

    expect(result).toBeUndefined();
  });

  it('falls back to the default view and requests persistence when the active view is unavailable', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: () => ({ nodes: [], edges: [] }),
      },
      { core: true, isDefault: true }
    );

    const result = applyGraphViewTransform(registry, 'missing.view', viewContext, rawGraphData);

    expect(result).toEqual({
      activeViewId: 'codegraphy.connections',
      graphData: { nodes: [], edges: [] },
      persistSelectedViewId: 'codegraphy.connections',
    });
  });

  it('returns raw graph data when no valid fallback view exists', () => {
    const registry = {
      get: vi.fn(() => undefined),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => 'codegraphy.connections'),
    };

    const result = applyGraphViewTransform(
      registry,
      'missing.view',
      viewContext,
      rawGraphData
    );

    expect(result).toEqual({
      activeViewId: 'missing.view',
      graphData: rawGraphData,
    });
  });

  it('returns raw graph data when the default view matches the unavailable active view', () => {
    const registry = {
      get: vi.fn(() => undefined),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => 'missing.view'),
    };

    const result = applyGraphViewTransform(
      registry,
      'missing.view',
      viewContext,
      rawGraphData
    );

    expect(result).toEqual({
      activeViewId: 'missing.view',
      graphData: rawGraphData,
    });
  });

  it('returns raw graph data when the default view id is falsy', () => {
    const fallbackView: IViewInfo = {
      core: false,
      order: 0,
      view: {
        id: '',
        name: 'Fallback',
        icon: 'symbol-file',
        description: 'Fallback view',
        transform: () => ({ nodes: [{ id: 'fallback', label: 'fallback', color: '#000000' }], edges: [] }),
      },
    };
    const registry = {
      get: vi.fn((viewId: string) => (viewId === '' ? fallbackView : undefined)),
      isViewAvailable: vi.fn(() => false),
      getDefaultViewId: vi.fn(() => ''),
    };

    const result = applyGraphViewTransform(
      registry,
      'missing.view',
      viewContext,
      rawGraphData
    );

    expect(result).toEqual({
      activeViewId: 'missing.view',
      graphData: rawGraphData,
    });
  });

  it('uses the active view transform when the current view is available', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: (graphData) => graphData,
      },
      { core: true, isDefault: true }
    );
    registry.register({
      id: 'codegraphy.folder',
      name: 'Folder',
      icon: 'folder',
      description: 'Folder view',
      transform: () => ({
        nodes: [{ id: 'folder', label: 'folder', color: '#000000' }],
        edges: [],
      }),
    });

    const result = applyGraphViewTransform(registry, 'codegraphy.folder', viewContext, rawGraphData);

    expect(result).toEqual({
      activeViewId: 'codegraphy.folder',
      graphData: {
        nodes: [{ id: 'folder', label: 'folder', color: '#000000' }],
        edges: [],
      },
    });
  });

  it('hides synthetic package nodes outside the focused imports view', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: (graphData) => graphData,
      },
      { core: true, isDefault: true }
    );

    const result = applyGraphViewTransform(
      registry,
      'codegraphy.connections',
      viewContext,
      rawGraphWithPackageData,
    );

    expect(result).toEqual({
      activeViewId: 'codegraphy.connections',
      graphData: {
        nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
        edges: [],
      },
    });
  });

  it('keeps synthetic package nodes inside the focused imports view', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: (graphData) => graphData,
      },
      { core: true, isDefault: true }
    );
    registry.register({
      id: 'codegraphy.typescript.focused-imports',
      name: 'Focused Imports',
      icon: 'symbol-file',
      description: 'TypeScript imports',
      transform: (graphData) => graphData,
    });

    const result = applyGraphViewTransform(
      registry,
      'codegraphy.typescript.focused-imports',
      viewContext,
      rawGraphWithPackageData,
    );

    expect(result).toEqual({
      activeViewId: 'codegraphy.typescript.focused-imports',
      graphData: rawGraphWithPackageData,
    });
  });

  it('falls back when a registered view is present but unavailable in the current context', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: () => ({ nodes: [], edges: [] }),
      },
      { core: true, isDefault: true }
    );
    registry.register({
      id: 'codegraphy.depth-graph',
      name: 'Depth Graph',
      icon: 'git-commit',
      description: 'Focused graph',
      isAvailable: () => false,
      transform: () => ({
        nodes: [{ id: 'depth', label: 'depth', color: '#111111' }],
        edges: [],
      }),
    });

    const result = applyGraphViewTransform(
      registry,
      'codegraphy.depth-graph',
      viewContext,
      rawGraphData
    );

    expect(result).toEqual({
      activeViewId: 'codegraphy.connections',
      graphData: { nodes: [], edges: [] },
      persistSelectedViewId: 'codegraphy.connections',
    });
  });

  it('maps available views with the active flag for the webview payload', () => {
    const registry = new ViewRegistry();
    registry.register(
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        transform: (graphData) => graphData,
      },
      { core: true, isDefault: true }
    );
    registry.register({
      id: 'codegraphy.folder',
      name: 'Folder',
      icon: 'folder',
      description: 'Folder view',
      transform: (graphData) => graphData,
    });

    expect(mapAvailableViews(registry.getAvailableViews(viewContext), 'codegraphy.folder')).toEqual([
      {
        id: 'codegraphy.connections',
        name: 'Connections',
        icon: 'symbol-file',
        description: 'Default view',
        active: false,
      },
      {
        id: 'codegraphy.folder',
        name: 'Folder',
        icon: 'folder',
        description: 'Folder view',
        active: true,
      },
    ]);
  });
});
