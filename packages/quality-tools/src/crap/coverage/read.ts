import { existsSync, readFileSync } from 'fs';

export interface IstanbulStatementMapEntry {
  end: { column: number; line: number };
  start: { column: number; line: number };
}

export interface IstanbulFileCoverage {
  path: string;
  s: Record<string, number>;
  statementMap: Record<string, IstanbulStatementMapEntry>;
}

export function readCoverageReport(path: string): Record<string, IstanbulFileCoverage> {
  if (!existsSync(path)) {
    throw new Error(`Coverage data not found: ${path}`);
  }

  return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, IstanbulFileCoverage>;
}
