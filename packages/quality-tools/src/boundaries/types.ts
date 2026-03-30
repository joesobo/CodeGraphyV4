export interface BoundaryLayerRule {
  allow: string[];
  include: string[];
  name: string;
}

export interface BoundaryFileNode {
  absolutePath: string;
  entrypoint: boolean;
  incoming: number;
  layer?: string;
  outgoing: number;
  packageName?: string;
  packageRelativePath?: string;
  relativePath: string;
}

export interface BoundaryViolation {
  from: string;
  fromLayer?: string;
  reason: string;
  to: string;
  toLayer?: string;
}

export interface BoundaryReport {
  deadEnds: BoundaryFileNode[];
  deadSurfaces: BoundaryFileNode[];
  files: BoundaryFileNode[];
  layerViolations: BoundaryViolation[];
  target: string;
}
