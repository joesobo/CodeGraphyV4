import { renderMarkdownFiles } from './markdownFiles';
import type { ExportConnectionsSection, ExportGroup } from './types';

type ExportRules = ExportConnectionsSection['rules'];

export function renderMarkdownGroupsSection(
  groups: ExportConnectionsSection['groups'],
  rules: ExportRules,
): string[] {
  const groupEntries = Object.entries(groups);
  if (groupEntries.length === 0) {
    return ['- none', ''];
  }

  const lines: string[] = [];

  for (const [pattern, group] of groupEntries) {
    lines.push(`#### \`${pattern}\``);
    lines.push(`- style: ${renderMarkdownGroupStyle(group)}`);
    lines.push(...renderMarkdownFiles(group.files, rules));
    lines.push('');
  }

  return lines;
}

export function renderMarkdownUngroupedSection(
  files: ExportConnectionsSection['ungrouped'],
  rules: ExportRules,
): string[] {
  if (Object.keys(files).length === 0) {
    return [];
  }

  return [
    '### Ungrouped',
    '',
    ...renderMarkdownFiles(files, rules),
    '',
  ];
}

export function renderMarkdownGroupStyle(group: ExportGroup): string {
  const styleParts = [group.style.color];

  if (group.style.shape2D) {
    styleParts.push(group.style.shape2D);
  }

  if (group.style.shape3D) {
    styleParts.push(group.style.shape3D);
  }

  if (group.style.image) {
    styleParts.push(`image: ${group.style.image}`);
  }

  return styleParts.join(' | ');
}
