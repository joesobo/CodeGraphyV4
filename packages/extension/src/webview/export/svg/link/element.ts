import type { SvgExportLink, SvgPosition } from '../contracts';
import { DEFAULT_DIRECTION_COLOR } from '../../../../shared/fileColors';

const CURVATURE_EPSILON = 0.001;

function getCurveControlPoint(from: SvgPosition, to: SvgPosition, curvature: number): SvgPosition {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  return {
    x: (from.x + to.x) / 2 - curvature * dy,
    y: (from.y + to.y) / 2 + curvature * dx,
  };
}

export function buildLinkElement(
  link: SvgExportLink,
  from: SvgPosition,
  to: SvgPosition,
  showArrows: boolean
): string {
  const color = link.baseColor ?? DEFAULT_DIRECTION_COLOR;
  const strokeWidth = link.bidirectional ? 2 : 1;
  const markerAttr = showArrows ? ' marker-end="url(#arrowhead)"' : '';
  const curvature = link.curvature ?? 0;

  if (Math.abs(curvature) > CURVATURE_EPSILON) {
    const controlPoint = getCurveControlPoint(from, to, curvature);
    return `<path d="M${from.x},${from.y} Q${controlPoint.x},${controlPoint.y} ${to.x},${to.y}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${markerAttr}/>`;
  }

  return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="${strokeWidth}"${markerAttr}/>`;
}
