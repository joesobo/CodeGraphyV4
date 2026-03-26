import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/contracts';
import { assembleSvg, createBaseParts, createDefinitions, getPalette } from '../../../src/webview/export/svgDocument';
import type { SvgExportOptions } from '../../../src/webview/export/svgTypes';

describe('exportSvgDocument', () => {
  describe('getPalette', () => {
    it('derives arrow, background, and label colors from export options', () => {
      const options: SvgExportOptions = {
        directionMode: 'arrows',
        directionColor: 'not-a-hex',
        showLabels: true,
        theme: 'dark',
      };

      expect(getPalette(options)).toEqual({
        showArrows: true,
        arrowColor: DEFAULT_DIRECTION_COLOR,
        backgroundColor: '#18181b',
        labelColor: '#e2e8f0',
      });
    });

    it('keeps valid direction colors and light theme colors', () => {
      const options: SvgExportOptions = {
        directionMode: 'none',
        directionColor: '#ABCDEF',
        showLabels: false,
        theme: 'light',
      };

      expect(getPalette(options)).toEqual({
        showArrows: false,
        arrowColor: '#ABCDEF',
        backgroundColor: '#ffffff',
        labelColor: '#1e1e1e',
      });
    });
  });

  describe('createBaseParts', () => {
    it('builds the xml declaration, svg shell, and background rect', () => {
      expect(createBaseParts(
        { minX: -10, minY: -20, width: 120, height: 140 },
        '#ffffff'
      )).toEqual([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-10 -20 120 140" width="120" height="140">',
        '<rect x="-10" y="-20" width="120" height="140" fill="#ffffff"/>',
      ]);
    });
  });

  describe('createDefinitions', () => {
    it('returns marker definitions only when arrows are enabled', () => {
      expect(createDefinitions(false, '#abcdef')).toEqual([]);
      expect(createDefinitions(true, '#abcdef')).toEqual([
        '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">',
        '<polygon points="0 0, 10 3.5, 0 7" fill="#abcdef"/></marker>',
      ]);
    });
  });

  describe('assembleSvg', () => {
    it('injects defs before overlay images and closes the document', () => {
      const parts = createBaseParts(
        { minX: -10, minY: -20, width: 120, height: 140 },
        '#ffffff'
      );

      const svg = assembleSvg(parts, ['<clipPath id="node"/><circle cx="0" cy="0" r="5"/></clipPath>'], ['<image href="data:image/png;base64,abc"/>']);

      expect(svg).toContain('viewBox="-10 -20 120 140"');
      expect(svg).toContain('<rect x="-10" y="-20" width="120" height="140" fill="#ffffff"/>');
      expect(svg).toContain('<defs><clipPath id="node"/><circle cx="0" cy="0" r="5"/></clipPath></defs>');
      expect(svg).toContain('<image href="data:image/png;base64,abc"/>');
      expect(svg.indexOf('<defs>')).toBeLessThan(svg.indexOf('<image'));
      expect(svg).not.toContain('Stryker was here!');
      expect(svg).toContain('</svg>');
    });

    it('leaves the svg body unchanged when there are no definitions', () => {
      const svg = assembleSvg(
        ['<svg>', '<rect/>'],
        [],
        ['<image href="data:image/png;base64,abc"/>']
      );

      expect(svg).toBe('<svg>\n<rect/>\n<image href="data:image/png;base64,abc"/>\n</svg>');
      expect(svg).not.toContain('<defs>');
    });
  });
});
