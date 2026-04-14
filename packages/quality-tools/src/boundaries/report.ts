import { formatBoundaryFile, formatBoundaryViolation, summaryLines } from './format';
import type { BoundaryReport } from './types';

export interface BoundaryReportOptions {
  verbose?: boolean;
}

function logLines(lines: string[]): void {
  for (const line of lines) {
    console.log(line);
  }
}

function reportBoundarySection<T>(
  title: string,
  items: T[],
  formatter: (item: T) => string,
): void {
  if (items.length === 0) {
    return;
  }

  console.log(title);
  for (const item of items) {
    console.log(formatter(item));
  }
  console.log('');
}

export function reportBoundaries(report: BoundaryReport, options: BoundaryReportOptions = {}): void {
  if (report.files.length === 0) {
    console.log('\nNo boundary-scope files found.\n');
    return;
  }

  logLines(summaryLines(report));
  reportBoundarySection('Layer violations:', report.layerViolations, formatBoundaryViolation);
  reportBoundarySection('Dead surfaces:', report.deadSurfaces, formatBoundaryFile);
  reportBoundarySection('Dead ends:', report.deadEnds, formatBoundaryFile);

  if (options.verbose) {
    console.log('All analyzed files:');
    for (const file of report.files) {
      console.log(formatBoundaryFile(file));
    }
  }
}
