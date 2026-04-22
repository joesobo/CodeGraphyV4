import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { useLegendPanelState } from '../../../../src/webview/components/legends/panel/state';

type PanelStateProps = Parameters<typeof useLegendPanelState>[0];

describe('webview/legends/panelState', () => {
  it('builds built-in entries with explicit color overrides and filters user rules by section', () => {
    const initialProps: PanelStateProps = {
      nodeTypes: [
        { id: 'file', label: 'File', defaultColor: '#111111' },
        { id: 'folder', label: 'Folder', defaultColor: '#222222' },
      ],
      edgeTypes: [
        { id: 'import', label: 'Import', defaultColor: '#333333' },
        { id: 'call', label: 'Call', defaultColor: '#fedcba' },
      ],
      nodeColorEnabled: { file: true, folder: true },
      nodeColors: { file: '#abcdef' },
      legends: [
        { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
        { id: 'edge:user', pattern: 'src/**', color: '#654321', target: 'edge' },
        {
          id: 'node:plugin',
          pattern: '*.ts',
          color: '#3178c6',
          target: 'node',
          isPluginDefault: true,
          pluginId: 'codegraphy.typescript',
          pluginName: 'TypeScript',
        },
      ] satisfies IGroup[],
    };
    const { result, rerender } = renderHook(
      (props: PanelStateProps) => useLegendPanelState(props),
      { initialProps },
    );

    expect(result.current.userLegendRules).toEqual([
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'edge:user', pattern: 'src/**', color: '#654321', target: 'edge' },
    ]);
    expect(result.current.nodeLegendRules).toEqual([
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
    ]);
    expect(result.current.edgeLegendRules).toEqual([
      { id: 'edge:user', pattern: 'src/**', color: '#654321', target: 'edge' },
    ]);
    expect(result.current.displayedNodeLegendRules).toEqual([
      { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
      {
        id: 'node:plugin',
        pattern: '*.ts',
        color: '#3178c6',
        target: 'node',
        isPluginDefault: true,
        pluginId: 'codegraphy.typescript',
        pluginName: 'TypeScript',
      },
    ]);
    expect(result.current.displayedEdgeLegendRules).toEqual([
      { id: 'edge:user', pattern: 'src/**', color: '#654321', target: 'edge' },
    ]);
    expect(result.current.nodeEntries).toEqual([
      { id: 'file', label: 'File', color: '#abcdef', defaultColor: '#111111', colorEnabled: true },
      { id: 'folder', label: 'Folder', color: '#222222', defaultColor: '#222222', colorEnabled: true },
    ]);
    expect(result.current.edgeEntries).toEqual([
      { id: 'import', label: 'Import', color: '#333333', defaultColor: '#333333', colorEnabled: true },
      { id: 'call', label: 'Call', color: '#fedcba', defaultColor: '#fedcba', colorEnabled: true },
    ]);

    rerender({
      ...initialProps,
      nodeTypes: [{ id: 'service', label: 'Service', defaultColor: '#101010' }],
      edgeTypes: [{ id: 'depends', label: 'Depends', defaultColor: '#202020' }],
      nodeColorEnabled: { service: true },
      nodeColors: { service: '#0f0f0f' },
      legends: [
        { id: 'edge:plugin', pattern: 'depends', color: '#808080', target: 'edge', isPluginDefault: true },
      ] satisfies IGroup[],
    });

    expect(result.current.userLegendRules).toEqual([]);
    expect(result.current.nodeLegendRules).toEqual([]);
    expect(result.current.edgeLegendRules).toEqual([]);
    expect(result.current.displayedNodeLegendRules).toEqual([]);
    expect(result.current.displayedEdgeLegendRules).toEqual([
      { id: 'edge:plugin', pattern: 'depends', color: '#808080', target: 'edge', isPluginDefault: true },
    ]);
    expect(result.current.nodeEntries).toEqual([
      { id: 'service', label: 'Service', color: '#0f0f0f', defaultColor: '#101010', colorEnabled: true },
    ]);
    expect(result.current.edgeEntries).toEqual([
      { id: 'depends', label: 'Depends', color: '#202020', defaultColor: '#202020', colorEnabled: true },
    ]);
  });

  it('resolves duplicate display rules by keeping user values and plugin metadata together', () => {
    const { result } = renderHook(() =>
      useLegendPanelState({
        nodeTypes: [],
        edgeTypes: [],
        nodeColorEnabled: {},
        nodeColors: {},
        legends: [
          { id: 'shared', pattern: 'src/**', color: '#123456', target: 'node' },
          {
            id: 'shared',
            pattern: '*.ts',
            color: '#3178c6',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.typescript',
            pluginName: 'TypeScript',
            imagePath: '/icons/ts.png',
          },
          {
            id: 'edge:shared',
            pattern: 'call',
            color: '#00ff00',
            target: 'edge',
            isPluginDefault: true,
            pluginName: 'Routing',
          },
          { id: 'edge:shared', pattern: 'import', color: '#ff00ff', target: 'edge' },
        ],
      }),
    );

    expect(result.current.displayedNodeLegendRules).toEqual([
      {
        id: 'shared',
        pattern: 'src/**',
        color: '#123456',
        target: 'node',
        isPluginDefault: true,
        pluginId: 'codegraphy.typescript',
        pluginName: 'TypeScript',
        imagePath: '/icons/ts.png',
      },
    ]);
    expect(result.current.displayedEdgeLegendRules).toEqual([
      {
        id: 'edge:shared',
        pattern: 'call',
        color: '#00ff00',
        target: 'edge',
        isPluginDefault: true,
        pluginName: 'Routing',
      },
    ]);
    expect(result.current.userLegendRules).toEqual([
      { id: 'shared', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'edge:shared', pattern: 'import', color: '#ff00ff', target: 'edge' },
    ]);
  });

  it('uses exact user edge-kind rules as built-in edge colors', () => {
    const { result } = renderHook(() =>
      useLegendPanelState({
        nodeTypes: [],
        edgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#111111' }],
        nodeColorEnabled: {},
        nodeColors: {},
        legends: [
          { id: 'legend:edge:import', pattern: 'import', color: '#abcdef', target: 'edge' },
        ],
      }),
    );

    expect(result.current.edgeEntries).toEqual([
      { id: 'import', label: 'Imports', color: '#abcdef', defaultColor: '#111111', colorEnabled: true },
    ]);
    expect(result.current.edgeLegendRules).toEqual([]);
    expect(result.current.displayedEdgeLegendRules).toEqual([]);
  });

  it('applies optimistic default-rule updates before the extension echoes legends back', () => {
    const { result } = renderHook(() =>
      useLegendPanelState({
        nodeTypes: [],
        edgeTypes: [],
        nodeColorEnabled: {},
        nodeColors: {},
        legends: [
          {
            id: 'plugin:codegraphy.python:*.py',
            pattern: '*.py',
            color: '#3776ab',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.python',
            pluginName: 'Python',
          },
          {
            id: 'plugin:codegraphy.typescript:*.ts',
            pattern: '*.ts',
            color: '#3178c6',
            target: 'node',
            isPluginDefault: true,
            pluginId: 'codegraphy.typescript',
            pluginName: 'TypeScript',
          },
        ],
        optimisticLegendUpdates: {
          'plugin:codegraphy.python:*.py': {
            updates: { disabled: true },
            expiresAt: Date.now() + 5_000,
          },
          'plugin:codegraphy.typescript:*.ts': {
            updates: { disabled: true },
            expiresAt: Date.now() + 5_000,
          },
        },
      }),
    );

    expect(result.current.displayedNodeLegendRules).toEqual([
      {
        id: 'plugin:codegraphy.python:*.py',
        pattern: '*.py',
        color: '#3776ab',
        target: 'node',
        isPluginDefault: true,
        pluginId: 'codegraphy.python',
        pluginName: 'Python',
        disabled: true,
      },
      {
        id: 'plugin:codegraphy.typescript:*.ts',
        pattern: '*.ts',
        color: '#3178c6',
        target: 'node',
        isPluginDefault: true,
        pluginId: 'codegraphy.typescript',
        pluginName: 'TypeScript',
        disabled: true,
      },
    ]);
  });
});
