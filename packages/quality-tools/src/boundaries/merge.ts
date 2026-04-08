import type { BoundaryFileNode, BoundaryReport, BoundaryViolation } from './types';

export function mergeReports(target: string, reports: BoundaryReport[]): BoundaryReport {
  const files: BoundaryFileNode[] = [];
  const deadEnds: BoundaryFileNode[] = [];
  const deadSurfaces: BoundaryFileNode[] = [];
  const layerViolations: BoundaryViolation[] = [];

  for (const report of reports) {
    files.push(...report.files);
    deadEnds.push(...report.deadEnds);
    deadSurfaces.push(...report.deadSurfaces);
    layerViolations.push(...report.layerViolations);
  }

  return {
    deadEnds,
    deadSurfaces,
    files,
    layerViolations,
    target
  };
}
