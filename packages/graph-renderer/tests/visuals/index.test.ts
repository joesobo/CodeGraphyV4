// @vitest-environment node

import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import {
  CONNECTED_LINK_OPACITY,
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_SIZE,
  DEFAULT_PACKAGE_NODE_COLOR,
  FILE_TYPE_COLORS,
  FILE_ICON_SCALE,
  FOLDER_ICON_SCALE,
  GRAPH_NODE_BORDER_WIDTH,
  GRAPH_NODE_LABEL_FONT,
  GRAPH_NODE_LABEL_PADDING,
  GRAPH_NODE_SELECTION_BORDER_WIDTH,
  LINK_BASE_WIDTH,
  MATERIAL_TRANSPARENT_NODE_COLOR,
  MAX_NODE_SIZE,
  MIN_NODE_SIZE,
  MUTED_LINK_OPACITY,
  OWNED_GRAPH_COLLISION_RADIUS_PADDING,
  ORDINARY_LINK_OPACITY,
  computeConnectionSizes,
  extractPrimaryColor,
  fileIconSize,
  findMaterialMatch,
  folderIconSize,
  graphNodeLabelTop,
  getFileColor,
  toSvgDataUrl,
  toWhiteSvgDataUrl,
} from '../../src/visuals/index.js';

describe('graph visual semantics', () => {
  it('exports the shared palette and rendering metrics', () => {
    expect(FILE_TYPE_COLORS['.ts']).toBe('#93C5FD');
    expect(getFileColor('.TS')).toBe('#93C5FD');
    expect(getFileColor('.unknown')).toBe(DEFAULT_NODE_COLOR);
    expect({
      DEFAULT_DIRECTION_COLOR,
      DEFAULT_FOLDER_NODE_COLOR,
      DEFAULT_NODE_SIZE,
      DEFAULT_PACKAGE_NODE_COLOR,
      FILE_ICON_SCALE,
      FOLDER_ICON_SCALE,
      GRAPH_NODE_BORDER_WIDTH,
      GRAPH_NODE_LABEL_FONT,
      GRAPH_NODE_LABEL_PADDING,
      GRAPH_NODE_SELECTION_BORDER_WIDTH,
      LINK_BASE_WIDTH,
      MATERIAL_TRANSPARENT_NODE_COLOR,
      MAX_NODE_SIZE,
      MIN_NODE_SIZE,
      MUTED_LINK_OPACITY,
      OWNED_GRAPH_COLLISION_RADIUS_PADDING,
      ORDINARY_LINK_OPACITY,
      CONNECTED_LINK_OPACITY,
    }).toEqual({
      DEFAULT_DIRECTION_COLOR: '#475569',
      DEFAULT_FOLDER_NODE_COLOR: '#A1A1AA',
      DEFAULT_NODE_SIZE: 16,
      DEFAULT_PACKAGE_NODE_COLOR: '#F59E0B',
      FILE_ICON_SCALE: 1.2,
      FOLDER_ICON_SCALE: 2,
      GRAPH_NODE_BORDER_WIDTH: 2,
      GRAPH_NODE_LABEL_FONT: '12px Sans-Serif',
      GRAPH_NODE_LABEL_PADDING: 2,
      GRAPH_NODE_SELECTION_BORDER_WIDTH: 3,
      LINK_BASE_WIDTH: 1,
      MATERIAL_TRANSPARENT_NODE_COLOR: 'rgba(0, 0, 0, 0)',
      MAX_NODE_SIZE: 30,
      MIN_NODE_SIZE: 8,
      MUTED_LINK_OPACITY: 0.12,
      OWNED_GRAPH_COLLISION_RADIUS_PADDING: 4,
      ORDINARY_LINK_OPACITY: 0.3,
      CONNECTED_LINK_OPACITY: 0.9,
    });
    expect(fileIconSize(10)).toBe(12);
    expect(folderIconSize(10)).toBe(20);
    expect(graphNodeLabelTop(10, 8, 2)).toBe(19);
  });

  it('sizes nodes from distinct neighboring nodes and ignores unknown endpoints', () => {
    const sizes = computeConnectionSizes(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'missing', to: 'a' },
      ],
    );

    expect(sizes.get('a')).toBe(8);
    expect(sizes.get('b')).toBe(8);
    expect(sizes.get('c')).toBe(8);
  });

  it('matches Material Theme path, extension, and language rules', () => {
    expect(findMaterialMatch('apps/web/vite.config.ts', {
      fileExtensions: { ts: 'typescript' },
      fileNames: { 'web/vite.config.ts': 'vite' },
    })).toEqual({ iconName: 'vite', key: 'web/vite.config.ts', kind: 'fileName' });
    expect(findMaterialMatch('README.MARKDOWN', {
      languageIds: { markdown: 'markdown' },
    })).toEqual({ iconName: 'markdown', key: 'MARKDOWN', kind: 'fileExtension' });
    expect(findMaterialMatch('packages/app/src', {
      folderNames: { src: 'folder-src' },
    }, { nodeType: 'folder' })).toEqual({
      iconName: 'folder-src', key: 'src', kind: 'folderName',
    });
  });

  it('extracts and transforms Material Theme SVG colors in browser-safe data URLs', () => {
    const svg = '<svg aria-label="cafe ☕"><path fill="#abc"/><path stroke="#ABC"/></svg>';
    expect(extractPrimaryColor(svg)).toBe('#AABBCC');
    expect(extractPrimaryColor('<svg/>')).toBe('#90A4AE');
    expect(Buffer.from(toSvgDataUrl(svg).split(',')[1]!, 'base64').toString('utf8')).toBe(svg);
    expect(Buffer.from(toWhiteSvgDataUrl(svg).split(',')[1]!, 'base64').toString('utf8'))
      .toContain('#FFFFFF');
  });
});
