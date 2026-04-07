import type { BoundaryFileNode, BoundaryReport, BoundaryViolation } from './types';

function formatLayerLabel(layer?: string): string {
  return layer ? ` [${layer}]` : '';
}

export function summaryLines(report: BoundaryReport): string[] {
  return [
    '',
    `Boundaries for ${report.target}`,
    '━'.repeat(72),
    `Files: ${report.files.length}`,
    `Layer violations: ${report.layerViolations.length}`,
    `Dead surfaces: ${report.deadSurfaces.length}`,
    `Dead ends: ${report.deadEnds.length}`,
    ''
  ];
}

export function formatBoundaryFile(file: Pick<BoundaryFileNode, 'relativePath' | 'layer' | 'incoming' | 'outgoing'>): string {
  return `- ${file.relativePath}${formatLayerLabel(file.layer)} (in: ${file.incoming}, out: ${file.outgoing})`;
}

export function formatBoundaryViolation(violation: BoundaryViolation): string {
  return `- ${violation.from} [${violation.fromLayer ?? 'unclassified'}] -> ${violation.to} [${violation.toLayer ?? 'unclassified'}]: ${violation.reason}`;
}
