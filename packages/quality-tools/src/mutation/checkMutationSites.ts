import { readFileSync } from 'fs';

export interface MutationSiteViolation {
  count: number;
  file: string;
}

interface Mutant {
  id: string;
}

interface MutationFileReport {
  mutants: Mutant[];
}

interface MutationReport {
  files: Record<string, MutationFileReport>;
}

export function findMutationSiteViolations(reportPath: string, threshold = 50): MutationSiteViolation[] {
  const report = JSON.parse(readFileSync(reportPath, 'utf-8')) as MutationReport;

  return Object.entries(report.files ?? {})
    .map(([file, entry]) => ({ count: (entry.mutants ?? []).length, file }))
    .filter((entry) => entry.count > threshold)
    .sort((left, right) => right.count - left.count);
}

export function reportMutationSiteViolations(reportPath: string, threshold = 50): void {
  const violations = findMutationSiteViolations(reportPath, threshold);
  if (violations.length === 0) {
    console.log(`\n✅ All files are within the mutation site threshold (${threshold}).\n`);
    return;
  }

  console.log(`\n⚠️  MUTATION SITE THRESHOLD EXCEEDED (max: ${threshold})`);
  console.log('━'.repeat(60));
  console.log('The following files have too many mutation sites, indicating');
  console.log('high complexity. Consider splitting them into smaller modules.\n');

  for (const violation of violations) {
    console.log(`  ${violation.count} mutation sites  →  ${violation.file}`);
  }

  console.log(`\n${'━'.repeat(60)}`);
  console.log(`${violations.length} file(s) exceed the threshold of ${threshold} mutation sites.\n`);
}
