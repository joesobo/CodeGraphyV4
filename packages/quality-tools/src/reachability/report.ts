import type { ReachabilityReport } from './types';

export interface ReachabilityReportOptions {
  verbose?: boolean;
}

function logLines(lines: string[]): void {
  for (const line of lines) {
    console.log(line);
  }
}

function summaryLines(report: ReachabilityReport): string[] {
  return [
    '',
    `Reachability for ${report.target}`,
    '━'.repeat(72),
    `Files: ${report.files.length}`,
    `Dead surfaces: ${report.deadSurfaces.length}`,
    `Dead ends: ${report.deadEnds.length}`,
    ''
  ];
}

function formatFile(file: { relativePath: string; layer?: string; incoming: number; outgoing: number }): string {
  const layerLabel = file.layer ? ` [${file.layer}]` : '';
  return `- ${file.relativePath}${layerLabel} (in: ${file.incoming}, out: ${file.outgoing})`;
}

export function reportReachability(
  report: ReachabilityReport,
  options: ReachabilityReportOptions = {},
): void {
  if (report.files.length === 0) {
    console.log('\nNo reachability-scope files found.\n');
    return;
  }

  logLines(summaryLines(report));

  if (report.deadSurfaces.length > 0) {
    console.log('Dead surfaces:');
    for (const file of report.deadSurfaces) {
      console.log(formatFile(file));
    }
    console.log('');
  }

  if (report.deadEnds.length > 0) {
    console.log('Dead ends:');
    for (const file of report.deadEnds) {
      console.log(formatFile(file));
    }
    console.log('');
  }

  if (options.verbose) {
    console.log('All analyzed files:');
    for (const file of report.files) {
      console.log(formatFile(file));
    }
  }
}
