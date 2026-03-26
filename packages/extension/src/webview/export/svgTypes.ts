import type { DirectionMode, NodeShape2D } from '../../shared/contracts';

export interface SvgExportLinkNodeRef {
  id?: string | number;
}

export interface SvgExportNode {
  id: string;
  label: string;
  size: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  shape2D?: NodeShape2D;
  imageUrl?: string;
  x?: number;
  y?: number;
}

export interface SvgExportLink {
  source?: string | number | SvgExportLinkNodeRef;
  target?: string | number | SvgExportLinkNodeRef;
  bidirectional: boolean;
  baseColor?: string;
  curvature?: number;
}

export interface SvgExportOptions {
  directionMode: DirectionMode;
  directionColor: string;
  showLabels: boolean;
  theme: string;
}

export interface SvgPosition {
  x: number;
  y: number;
}

export interface SvgBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface SvgPalette {
  showArrows: boolean;
  arrowColor: string;
  backgroundColor: string;
  labelColor: string;
}
