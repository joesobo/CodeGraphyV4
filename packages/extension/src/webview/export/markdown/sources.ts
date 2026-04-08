import type { ExportConnectionsSection } from '../shared/contracts';

export function renderMarkdownRulesSection(
  sources: ExportConnectionsSection['sources'],
): string[] {
  const ruleEntries = Object.entries(sources);
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
