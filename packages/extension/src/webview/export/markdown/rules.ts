import type { ExportConnectionsSection } from '../shared/contracts';

export function renderMarkdownRulesSection(
  rules: ExportConnectionsSection['rules'],
): string[] {
  const ruleEntries = Object.entries(rules);
  if (ruleEntries.length === 0) {
    return [];
  }

  const lines = ['### Rules', ''];

  for (const [id, rule] of ruleEntries) {
    lines.push(`- **${rule.name}** (\`${id}\`, ${rule.plugin}) - ${rule.connections} connections`);
  }

  lines.push('');
  return lines;
}
