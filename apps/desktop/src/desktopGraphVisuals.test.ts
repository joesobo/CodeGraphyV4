import {
  CONNECTED_LINK_OPACITY,
  DEFAULT_DIRECTION_COLOR,
  GRAPH_NODE_BORDER_WIDTH,
  GRAPH_NODE_SELECTION_BORDER_WIDTH,
  MATERIAL_TRANSPARENT_NODE_COLOR,
  MUTED_LINK_OPACITY,
  ORDINARY_LINK_OPACITY,
} from '@codegraphy-dev/graph-renderer/visuals';
import { describe, expect, it } from 'vitest';
import {
  createDesktopGraphNodeVisual,
  desktopGraphLinkColor,
  desktopGraphLinkOpacity,
  desktopGraphLinkWidth,
  desktopGraphNodeSizes,
  type DesktopGraphAppearance,
} from './desktopGraphVisuals';
import type { DesktopGraph } from './model';

const appearance: DesktopGraphAppearance = {
  labelForeground: '#f4f4f5',
  labelMutedForeground: '#71717a',
  linkHighlight: '#2dd4bf',
  linkMuted: '#334155',
  nodeSelectionBorder: '#ffffff',
  stageBackground: '#09090b',
};

describe('desktop graph visuals', () => {
  it('uses the shared connection sizing algorithm', () => {
    const graph: DesktopGraph = {
      edges: [
        { id: 'a-b', from: 'a.ts', to: 'b.ts', kind: 'imports' },
        { id: 'a-c', from: 'a.ts', to: 'src', kind: 'contains' },
      ],
      nodes: [
        { id: 'a.ts', label: 'a.ts', nodeType: 'file' },
        { id: 'b.ts', label: 'b.ts', nodeType: 'file' },
        { id: 'src', label: 'src', nodeType: 'folder' },
      ],
    };

    expect([...desktopGraphNodeSizes(graph)]).toEqual([
      ['a.ts', 8],
      ['b.ts', 8],
      ['src', 8],
    ]);
  });

  it('matches extension Material File and Folder node inputs', () => {
    const file = createDesktopGraphNodeVisual(
      { id: 'src/App.tsx', label: 'App.tsx', nodeType: 'file' },
      12,
      { color: '#3178c6', imageUrl: 'data:file', mode: 'file' },
      false,
      appearance,
    );
    const folder = createDesktopGraphNodeVisual(
      { id: 'src', label: 'src', nodeType: 'folder' },
      10,
      { color: MATERIAL_TRANSPARENT_NODE_COLOR, imageUrl: 'data:folder', mode: 'folder' },
      true,
      appearance,
    );

    expect(file).toEqual({
      imageUrl: 'data:file',
      size: 12,
      style: {
        borderColor: '#3178c6',
        borderWidth: GRAPH_NODE_BORDER_WIDTH,
        cornerRadius: 0,
        fillColor: '#3178c6',
        fillOpacity: 1,
        height: 24,
        opacity: 1,
        shape: 'circle',
        width: 24,
      },
    });
    expect(folder.style).toEqual({
      borderColor: appearance.nodeSelectionBorder,
      borderWidth: GRAPH_NODE_SELECTION_BORDER_WIDTH,
      cornerRadius: 0,
      fillColor: MATERIAL_TRANSPARENT_NODE_COLOR,
      fillOpacity: 1,
      height: 20,
      opacity: 1,
      shape: 'circle',
      width: 20,
    });
    expect(createDesktopGraphNodeVisual(
      { id: 'muted.ts', label: 'muted.ts', nodeType: 'file' },
      8,
      undefined,
      false,
      appearance,
      false,
    ).style.opacity).toBe(0.15);
  });

  it('matches extension Relationship highlight metrics', () => {
    const connected = { source: { id: 'a.ts' }, target: { id: 'b.ts' } };
    const muted = { source: { id: 'c.ts' }, target: { id: 'd.ts' } };

    expect(desktopGraphLinkColor(connected, undefined, appearance)).toBe(DEFAULT_DIRECTION_COLOR);
    expect(desktopGraphLinkOpacity(connected, undefined)).toBe(ORDINARY_LINK_OPACITY);
    expect(desktopGraphLinkWidth(connected, undefined)).toBe(1);
    expect(desktopGraphLinkColor(connected, 'a.ts', appearance)).toBe(appearance.linkHighlight);
    expect(desktopGraphLinkOpacity(connected, 'a.ts')).toBe(CONNECTED_LINK_OPACITY);
    expect(desktopGraphLinkWidth(connected, 'a.ts')).toBe(2);
    expect(desktopGraphLinkColor(muted, 'a.ts', appearance)).toBe(appearance.linkMuted);
    expect(desktopGraphLinkOpacity(muted, 'a.ts')).toBe(MUTED_LINK_OPACITY);
    expect(desktopGraphLinkWidth(muted, 'a.ts')).toBe(1);
  });
});
