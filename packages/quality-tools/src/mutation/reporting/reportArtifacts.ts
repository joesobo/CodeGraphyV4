import { cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT_REPORT_DIR = 'reports/mutation';

export function reportDirectory(reportKey: string): string {
  return `${ROOT_REPORT_DIR}/${reportKey}`;
}

export function incrementalReportPath(reportKey: string): string {
  return `${reportDirectory(reportKey)}/stryker-incremental-${reportKey}.json`;
}

export function copySharedMutationReports(reportKey: string, repoRoot = process.cwd()): string {
  const targetDirectory = join(repoRoot, reportDirectory(reportKey));
  mkdirSync(targetDirectory, { recursive: true });

  const sharedJson = join(repoRoot, ROOT_REPORT_DIR, 'mutation.json');
  const sharedHtml = join(repoRoot, ROOT_REPORT_DIR, 'mutation.html');

  if (existsSync(sharedJson)) {
    cpSync(sharedJson, `${targetDirectory}/mutation.json`);
  }

  if (existsSync(sharedHtml)) {
    cpSync(sharedHtml, `${targetDirectory}/mutation.html`);
  }

  return join(targetDirectory, 'mutation.json');
}
