import { analyzeCrap } from './analyzeCrap';
import { createCoverageProfiles } from './coverageProfiles';
import { readCoverageReport } from './readCoverage';
import { reportCrap } from './reportCrap';
import { cleanCliArgs, flagValue, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/repoRoot';
import { resolveQualityTarget } from '../shared/resolveTarget';
import { assertSourceScope } from '../shared/sourceScope';
import { runCommand } from '../shared/runCommand';

export interface CrapCliDependencies {
  analyzeCrap: typeof analyzeCrap;
  createCoverageProfiles: typeof createCoverageProfiles;
  readCoverageReport: typeof readCoverageReport;
  reportCrap: typeof reportCrap;
  resolveQualityTarget: typeof resolveQualityTarget;
  runCommand: typeof runCommand;
}

const DEFAULT_DEPENDENCIES: CrapCliDependencies = {
  analyzeCrap,
  createCoverageProfiles,
  readCoverageReport,
  reportCrap,
  resolveQualityTarget,
  runCommand
};

export function parseThreshold(args: string[]): number {
  return parseInt(flagValue(args, '--threshold') ?? '8', 10);
}

export function runCrapCli(
  rawArgs: string[],
  dependencies: CrapCliDependencies = DEFAULT_DEPENDENCIES
): void {
  const args = cleanCliArgs(rawArgs);
  const target = dependencies.resolveQualityTarget(REPO_ROOT, parseTargetArg(args));
  const threshold = parseThreshold(args);
  const filterScope = assertSourceScope(target);
  const profiles = dependencies.createCoverageProfiles(REPO_ROOT, target.packageName);

  profiles.forEach((profile) => {
    dependencies.runCommand(profile.command, profile.args, profile.cwd);
  });

  const reports = profiles.map((profile) => dependencies.readCoverageReport(profile.coveragePath));
  const results = dependencies.analyzeCrap(reports, REPO_ROOT, filterScope, threshold);
  dependencies.reportCrap(results, threshold);
}
