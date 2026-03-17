import { UNATTRIBUTED_RULE_KEY, type ExportConnectionsSection, type ExportFile } from './types';

type ExportRules = ExportConnectionsSection['rules'];

export function renderMarkdownFiles(
  files: Record<string, ExportFile>,
  rules: ExportRules,
): string[] {
  const lines: string[] = [];

  for (const [filePath, file] of Object.entries(files)) {
    if (!file.imports) {
      lines.push(`- ${filePath}`);
      continue;
    }

    const ruleKeys = Object.keys(file.imports);
    lines.push(`- **${filePath}**`);

    if (ruleKeys.length === 1 && ruleKeys[0] === UNATTRIBUTED_RULE_KEY) {
      for (const target of file.imports[UNATTRIBUTED_RULE_KEY]) {
        lines.push(`  - ${target}`);
      }
      continue;
    }

    for (const [ruleKey, targets] of Object.entries(file.imports)) {
      if (targets.length === 0) {
        continue;
      }

      lines.push(`  - *${resolveMarkdownRuleLabel(ruleKey, rules)}*`);
      for (const target of targets) {
        lines.push(`    - ${target}`);
      }
    }
  }

  return lines;
}

export function resolveMarkdownRuleLabel(
  ruleKey: string,
  rules: ExportRules,
): string {
  if (ruleKey === UNATTRIBUTED_RULE_KEY) {
    return 'unattributed';
  }

  return rules[ruleKey]?.name ?? ruleKey;
}
