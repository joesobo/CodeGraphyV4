export function createLegendRuleId(rule: Record<string, unknown>, index: number): string {
  const fallbackPattern = `rule-${index + 1}`;
  const target = readNonEmptyString(rule.target) ?? 'node';
  const pattern = readNonEmptyString(rule.pattern) ?? fallbackPattern;
  const slug = createLegendSlug(pattern) || fallbackPattern;

  return `legend:${target}:${slug}:${index + 1}`;
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0
    ? value
    : undefined;
}

function createLegendSlug(pattern: string): string {
  return pattern
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}
