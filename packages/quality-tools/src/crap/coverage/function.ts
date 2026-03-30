import { type FunctionInfo } from '../analysis/extractFunctions';
import { type IstanbulFileCoverage } from './read';

function statementsInRange(
  fn: FunctionInfo,
  fileCoverage: IstanbulFileCoverage
): boolean[] {
  return Object.entries(fileCoverage.statementMap)
    .filter(([, location]) => location.start.line >= fn.line && location.end.line <= fn.endLine)
    .map(([id]) => fileCoverage.s[id] > 0);
}

export function getFunctionCoverage(
  fn: FunctionInfo,
  fileCoverage: IstanbulFileCoverage
): number {
  const statementCoverage = statementsInRange(fn, fileCoverage);
  if (statementCoverage.length === 0) {
    return 0;
  }

  const covered = statementCoverage.filter(Boolean).length;
  return (covered / statementCoverage.length) * 100;
}
