import { existsSync } from 'fs';
import * as path from 'path';
import { calculateCrap } from './calculateCrap';
import { extractFunctions } from './extractFunctions';
import { type IstanbulFileCoverage } from './readCoverage';
import { toPosix } from '../shared/pathUtils';
import { createSourceFile, shouldIncludeFile } from './fileSelection';
import { getFunctionCoverage } from './functionCoverage';

function analyzeCoverageEntry(
  filePath: string,
  fileCoverage: IstanbulFileCoverage,
  repoRoot: string,
  threshold: number
): CrapResult[] {
  const sourceFile = createSourceFile(filePath);

  return extractFunctions(sourceFile)
    .map((fn) => {
      const coverage = getFunctionCoverage(fn, fileCoverage);
      const crap = calculateCrap(fn.complexity, coverage);

      return {
        complexity: fn.complexity,
        coverage: Math.round(coverage),
        crap: Math.round(crap * 100) / 100,
        file: toPosix(path.relative(repoRoot, fn.file)),
        line: fn.line,
        name: fn.name
      };
    })
    .filter((result) => result.crap > threshold);
}

export interface CrapResult {
  complexity: number;
  coverage: number;
  crap: number;
  file: string;
  line: number;
  name: string;
}

export function analyzeCrap(
  coverageReports: Array<Record<string, IstanbulFileCoverage>>,
  repoRoot: string,
  filterScope?: string,
  threshold = 8
): CrapResult[] {
  return coverageReports
    .flatMap((coverageReport) => Object.entries(coverageReport))
    .filter(([filePath]) => shouldIncludeFile(filePath, filterScope, repoRoot))
    .filter(([filePath]) => existsSync(filePath))
    .flatMap(([filePath, fileCoverage]) => analyzeCoverageEntry(filePath, fileCoverage, repoRoot, threshold))
    .sort((left, right) => right.crap - left.crap);
}
