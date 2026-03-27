import { type ScrapExampleMetric } from './scrapTypes';

function uniqueNonEmptyValues(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.length > 0);
}

export function summarizeValues(label: string, values: string[]): string {
  const summarized = uniqueNonEmptyValues(values).slice(0, 3);
  return summarized.length === 0 ? '' : ` ${label}: ${summarized.join(', ')}.`;
}

export function summarizeBlockPaths(examples: ScrapExampleMetric[]): string {
  return summarizeValues(
    'Affected blocks',
    examples.map((example) => example.blockPath.join(' > '))
  );
}

export function summarizeHelperGroups(examples: ScrapExampleMetric[]): string {
  return summarizeValues(
    'Helper groups',
    examples.flatMap((example) => example.setupSubjectNames ?? [])
  );
}
