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

export function reportBoundaries(report: BoundaryReport, options: BoundaryReportOptions = {}): void {
  if (report.files.length === 0) {
    console.log('\nNo boundary-scope files found.\n');
    return;
  }

  logLines(summaryLines(report));

  if (report.layerViolations.length > 0) {
    console.log('Layer violations:');
    for (const violation of report.layerViolations) {
      console.log(formatBoundaryViolation(violation));
    }
    console.log('');
  }

  if (report.deadSurfaces.length > 0) {
    console.log('Dead surfaces:');
    for (const file of report.deadSurfaces) {
      console.log(formatBoundaryFile(file));
    }
    console.log('');
  }

  if (report.deadEnds.length > 0) {
    console.log('Dead ends:');
    for (const file of report.deadEnds) {
      console.log(formatBoundaryFile(file));
    }
    console.log('');
  }

  if (options.verbose) {
    console.log('All analyzed files:');
    for (const file of report.files) {
      console.log(formatBoundaryFile(file));
    }
  }
}
