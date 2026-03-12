import type { IGraphData, IGroup, IPluginStatus } from '../../../shared/types';
import { graphStore } from '../../store';
import { postMessage } from '../vscodeApi';
import {
  buildExportData,
  type ExportBuildContext,
  type ExportData,
  type ExportFile,
  UNATTRIBUTED_RULE_KEY,
} from './exportJson';
import { createExportTimestamp, getExportContext } from './common';

export function exportAsMarkdown(data: IGraphData): void {
  try {
    const { groups, pluginStatuses } = graphStore.getState();
    const markdown = buildMarkdownExport(data, groups, pluginStatuses, getExportContext());
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_MD',
      payload: {
        markdown,
        filename: `codegraphy-connections-${timestamp}.md`,
      },
    });
  } catch (error) {
    console.error('[CodeGraphy] Markdown export failed:', error);
  }
}

export function buildMarkdownExport(
  graphData: IGraphData,
  groups: IGroup[],
  pluginStatuses: IPluginStatus[] = [],
  context: ExportBuildContext = {},
): string {
  const data = buildExportData(graphData, groups, pluginStatuses, context);

  const lines: string[] = [
    '# CodeGraphy Export',
    '',
    `> ${data.summary.totalFiles} files, ${data.summary.totalConnections} connections`,
  ];

  if (data.scope.timeline.active) {
    lines.push(`> timeline commit: ${data.scope.timeline.commitSha ?? 'unknown'}`);
  } else {
    lines.push('> timeline: inactive');
  }
  lines.push('');

  lines.push('## Connections', '');

  const ruleEntries = Object.entries(data.sections.connections.rules);
  if (ruleEntries.length > 0) {
    lines.push('### Rules', '');
    for (const [id, rule] of ruleEntries) {
      lines.push(`- **${rule.name}** (\`${id}\`, ${rule.plugin}) - ${rule.connections} connections`);
    }
    lines.push('');
  }

  lines.push('### Groups', '');
  const groupEntries = Object.entries(data.sections.connections.groups);
  if (groupEntries.length === 0) {
    lines.push('- none', '');
  } else {
    for (const [pattern, group] of groupEntries) {
      const styleParts = [group.style.color];
      if (group.style.shape2D) styleParts.push(group.style.shape2D);
      if (group.style.shape3D) styleParts.push(group.style.shape3D);
      if (group.style.image) styleParts.push(`image: ${group.style.image}`);
      lines.push(`#### \`${pattern}\``);
      lines.push(`- style: ${styleParts.join(' | ')}`);
      renderFiles(lines, group.files, data);
      lines.push('');
    }
  }

  const ungroupedEntries = Object.entries(data.sections.connections.ungrouped);
  if (ungroupedEntries.length > 0) {
    lines.push('### Ungrouped', '');
    renderFiles(lines, data.sections.connections.ungrouped, data);
    lines.push('');
  }

  lines.push('## Images', '');
  const imageEntries = Object.entries(data.sections.images);
  if (imageEntries.length === 0) {
    lines.push('- none', '');
  } else {
    for (const [imagePath, meta] of imageEntries) {
      lines.push(`- \`${imagePath}\` (groups: ${meta.groups.map(g => `\`${g}\``).join(', ')})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderFiles(lines: string[], files: Record<string, ExportFile>, data: ExportData): void {
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
      if (targets.length === 0) continue;
      const label = ruleKey === UNATTRIBUTED_RULE_KEY
        ? 'unattributed'
        : (data.sections.connections.rules[ruleKey]?.name ?? ruleKey);
      lines.push(`  - *${label}*`);
      for (const target of targets) {
        lines.push(`    - ${target}`);
      }
    }
  }
}
