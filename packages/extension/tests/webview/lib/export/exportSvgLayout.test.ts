import { describe, expect, it } from 'vitest';
import { buildPositionMap, calculateBounds } from '../../../../src/webview/lib/export/exportSvgLayout';
import type { SvgExportNode } from '../../../../src/webview/lib/export/exportSvgTypes';

describe('exportSvgLayout', () => {
  describe('calculateBounds', () => {
    it('includes node sizes and export padding', () => {
      const nodes: SvgExportNode[] = [
        {
          id: 'left',
          label: 'left',
          size: 10,
          color: '#111111',
          borderColor: '#222222',
          borderWidth: 1,
          x: -20,
          y: 40,
        },
        {
          id: 'right',
          label: 'right',
          size: 30,
          color: '#333333',
          borderColor: '#444444',
          borderWidth: 2,
          x: 80,
          y: -10,
        },
      ];

      expect(calculateBounds(nodes)).toEqual({
        minX: -80,
        minY: -90,
        width: 240,
        height: 190,
      });
    });

    it('returns fallback bounds for an empty graph', () => {
      expect(calculateBounds([])).toEqual({
        minX: -150,
        minY: -150,
        width: 300,
        height: 300,
      });
    });
  });

  describe('buildPositionMap', () => {
    it('defaults missing coordinates to zero', () => {
      const nodes: SvgExportNode[] = [
        {
          id: 'defined',
          label: 'defined',
          size: 8,
          color: '#111111',
          borderColor: '#222222',
          borderWidth: 1,
          x: 12,
          y: 24,
        },
        {
          id: 'missing',
          label: 'missing',
          size: 8,
          color: '#333333',
          borderColor: '#444444',
          borderWidth: 1,
        },
      ];

      const positionMap = buildPositionMap(nodes);

      expect(positionMap.get('defined')).toEqual({ x: 12, y: 24 });
      expect(positionMap.get('missing')).toEqual({ x: 0, y: 0 });
    });
  });
});
