import type { BoundaryFileNode } from '../boundaries/types';

export interface ReachabilityReport {
  deadEnds: BoundaryFileNode[];
  deadSurfaces: BoundaryFileNode[];
  files: BoundaryFileNode[];
  target: string;
}
