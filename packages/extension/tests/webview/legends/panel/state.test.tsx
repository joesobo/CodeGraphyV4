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
        { id: 'call', label: 'Call', defaultColor: '#444444' },
      ],
      nodeColors: { file: '#abcdef' },
      edgeColors: { call: '#fedcba' },
      legends: [
        { id: 'node:user', pattern: 'src/**', color: '#123456', target: 'node' },
        { id: 'edge:user', pattern: 'src/**', color: '#654321', target: 'edge' },
        {
          id: 'node:plugin',
          pattern: '*.ts',
          color: '#3178c6',
          target: 'node',
          isPluginDefault: true,
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
        pluginName: 'TypeScript',
      },
    ]);
    expect(result.current.displayedEdgeLegendRules).toEqual([
      { id: 'edge:user', pattern: 'src/**', color: '#654321', target: 'edge' },
    ]);
    expect(result.current.nodeEntries).toEqual([
      { id: 'file', label: 'File', color: '#abcdef' },
      { id: 'folder', label: 'Folder', color: '#222222' },
    ]);
    expect(result.current.edgeEntries).toEqual([
      { id: 'import', label: 'Import', color: '#333333' },
      { id: 'call', label: 'Call', color: '#fedcba' },
    ]);

    rerender({
      ...initialProps,
      nodeTypes: [{ id: 'service', label: 'Service', defaultColor: '#101010' }],
      edgeTypes: [{ id: 'depends', label: 'Depends', defaultColor: '#202020' }],
      nodeColors: { service: '#0f0f0f' },
      edgeColors: {},
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
      { id: 'service', label: 'Service', color: '#0f0f0f' },
    ]);
    expect(result.current.edgeEntries).toEqual([
      { id: 'depends', label: 'Depends', color: '#202020' },
    ]);
  });

  it('resolves duplicate display rules by keeping user values and plugin metadata together', () => {
    const { result } = renderHook(() =>
      useLegendPanelState({
        nodeTypes: [],
        edgeTypes: [],
        nodeColors: {},
        edgeColors: {},
        legends: [
          { id: 'shared', pattern: 'src/**', color: '#123456', target: 'node' },
          {
            id: 'shared',
            pattern: '*.ts',
            color: '#3178c6',
            target: 'node',
            isPluginDefault: true,
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
        nodeColors: {},
        edgeColors: { import: '#222222' },
        legends: [
          { id: 'legend:edge:import', pattern: 'import', color: '#abcdef', target: 'edge' },
        ],
      }),
    );

    expect(result.current.edgeEntries).toEqual([
      { id: 'import', label: 'Imports', color: '#abcdef' },
    ]);
    expect(result.current.edgeLegendRules).toEqual([]);
    expect(result.current.displayedEdgeLegendRules).toEqual([]);
  });
});
