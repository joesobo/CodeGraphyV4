import { describe, expect, it } from 'vitest';
import type { IGraphNode, IGroup } from '../../../../src/shared/types';
import { buildGroupedSections, buildGroupStyle } from '../../../../src/webview/lib/export/exportJsonGroups';

describe('exportJsonGroups', () => {
  describe('buildGroupStyle', () => {
    it('omits default shapes and includes custom image metadata', () => {
      const group: IGroup = {
        id: 'group-1',
        pattern: 'src/**',
        color: '#123456',
        shape2D: 'circle',
        shape3D: 'sphere',
        imagePath: '.codegraphy/images/app.png',
      };

      expect(buildGroupStyle(group)).toEqual({
        color: '#123456',
        image: '.codegraphy/images/app.png',
      });
    });
  });

  describe('buildGroupedSections', () => {
    it('uses first-match wins, skips disabled groups, and preserves alphabetical file order', () => {
      const nodes: IGraphNode[] = [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'README.md', label: 'README.md', color: '#fff' },
      ];
      const groups: IGroup[] = [
        { id: 'disabled', pattern: 'src/**', color: '#999999', disabled: true },
        { id: 'tsx', pattern: '*.tsx', color: '#3B82F6', shape2D: 'diamond' },
        { id: 'src', pattern: 'src/**', color: '#10B981', imagePath: '.codegraphy/images/src.png' },
      ];
      const importsMap = new Map<string, Record<string, string[]>>([
        ['src/App.tsx', { rule: ['src/utils.ts'] }],
      ]);

      const result = buildGroupedSections(nodes, groups, importsMap);

      expect(Object.keys(result.groupsRecord)).toEqual(['*.tsx', 'src/**']);
      expect(result.groupsRecord['*.tsx'].files).toEqual({
        'src/App.tsx': { imports: { rule: ['src/utils.ts'] } },
      });
      expect(result.groupsRecord['*.tsx'].style).toEqual({
        color: '#3B82F6',
        shape2D: 'diamond',
      });
      expect(result.groupsRecord['src/**'].files).toEqual({
        'src/utils.ts': {},
      });
      expect(result.imagesRecord).toEqual({
        '.codegraphy/images/src.png': { groups: ['src/**'] },
      });
      expect(result.ungroupedFiles).toEqual({
        'README.md': {},
      });
    });
  });
});
