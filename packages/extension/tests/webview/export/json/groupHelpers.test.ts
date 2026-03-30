import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../../src/shared/graph/types';
import type { IGroup } from '../../../../src/shared/settings/groups';
import {
  buildGroupStyle,
  buildNodeGroupMap,
  createExportFile,
} from '../../../../src/webview/export/json/groupHelpers';

describe('exportJsonGroupHelpers', () => {
  describe('buildGroupStyle', () => {
    it('omits default shape values', () => {
      const group: IGroup = {
        id: 'group-1',
        pattern: 'src/**',
        color: '#123456',
        shape2D: 'circle',
        shape3D: 'sphere',
      };

      expect(buildGroupStyle(group)).toEqual({
        color: '#123456',
      });
    });

    it('includes non-default shapes and image metadata', () => {
      const group: IGroup = {
        id: 'group-1',
        pattern: 'src/**',
        color: '#123456',
        shape2D: 'diamond',
        shape3D: 'octahedron',
        imagePath: '.codegraphy/images/app.png',
      };

      expect(buildGroupStyle(group)).toEqual({
        color: '#123456',
        shape2D: 'diamond',
        shape3D: 'octahedron',
        image: '.codegraphy/images/app.png',
      });
    });
  });

  describe('buildNodeGroupMap', () => {
    it('uses the first matching group pattern for each node', () => {
      const nodes: IGraphNode[] = [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
      ];
      const groups: IGroup[] = [
        { id: 'tsx', pattern: '*.tsx', color: '#3B82F6' },
        { id: 'src', pattern: 'src/**', color: '#10B981' },
      ];

      expect(buildNodeGroupMap(nodes, groups)).toEqual(new Map([
        ['src/App.tsx', '*.tsx'],
        ['src/utils.ts', 'src/**'],
      ]));
    });

    it('skips nodes that do not match any group pattern', () => {
      const nodes: IGraphNode[] = [
        { id: 'README.md', label: 'README.md', color: '#fff' },
      ];

      expect(buildNodeGroupMap(nodes, [])).toEqual(new Map());
    });
  });

  describe('createExportFile', () => {
    it('returns an empty export file when imports are missing', () => {
      expect(createExportFile()).toEqual({});
    });

    it('wraps imports under the export file shape when present', () => {
      expect(createExportFile({ rule: ['target.ts'] })).toEqual({
        imports: { rule: ['target.ts'] },
      });
    });
  });
});
