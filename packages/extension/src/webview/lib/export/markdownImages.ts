import type { ExportData } from './types';

export function renderMarkdownImagesSection(
  images: ExportData['sections']['images'],
): string[] {
  const imageEntries = Object.entries(images);
  if (imageEntries.length === 0) {
    return ['- none', ''];
  }

  const lines: string[] = [];

  for (const [imagePath, meta] of imageEntries) {
    lines.push(`- \`${imagePath}\` (groups: ${meta.groups.map(group => `\`${group}\``).join(', ')})`);
  }

  lines.push('');
  return lines;
}
