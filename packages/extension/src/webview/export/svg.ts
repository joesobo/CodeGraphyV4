import { postMessage } from '../vscodeApi';
import { createExportTimestamp } from './exportContext';
import { assembleSvg, createBaseParts, createDefinitions, getPalette } from './svgDocument';
import { buildPositionMap, calculateBounds } from './svgLayout';
import { appendLinkElements } from './svgLinks';
import { appendNodeElements } from './svgNodes';
import type { SvgExportLink, SvgExportNode, SvgExportOptions } from './svgTypes';

export type { SvgExportLink, SvgExportNode, SvgExportOptions } from './svgTypes';

export function exportAsSvg(nodes: SvgExportNode[], links: SvgExportLink[], options: SvgExportOptions): void {
  try {
    const bounds = calculateBounds(nodes);
    const palette = getPalette(options);
    const parts = createBaseParts(bounds, palette.backgroundColor);
    const definitions = createDefinitions(palette.showArrows, palette.arrowColor);
    const imageElements: string[] = [];
    const positionMap = buildPositionMap(nodes);

    appendLinkElements(parts, links, positionMap, palette.showArrows);
    appendNodeElements(parts, definitions, imageElements, nodes, positionMap, options.showLabels, palette.labelColor);

    const svg = assembleSvg(parts, definitions, imageElements);
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_SVG',
      payload: { svg, filename: `codegraphy-${timestamp}.svg` },
    });
  } catch (error) {
    console.error('[CodeGraphy] SVG export failed:', error);
  }
}
