import { type ScrapFileMetric } from './metrics';

export function validationLines(metric: ScrapFileMetric): string[] {
  if ((metric.validationIssues?.length ?? 0) === 0) {
    return [];
  }

  return [
    '  validation:',
    ...(metric.validationIssues ?? []).map(
      (issue) => `    - [${issue.kind}] L${issue.line} ${issue.message}`
    )
  ];
}
