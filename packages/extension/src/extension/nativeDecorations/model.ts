import type { NodeDecorationPayload } from '../../shared/plugins/decorations';

export type NativeGitStatus =
  | 'added'
  | 'conflict'
  | 'deleted'
  | 'modified'
  | 'renamed'
  | 'untracked';

export interface NativeProblemCounts {
  errors: number;
  warnings: number;
}

const GIT_PRESENTATION: Record<NativeGitStatus, { color: string; label: string }> = {
  added: { color: '#73c991', label: 'Added' },
  conflict: { color: '#f14c4c', label: 'Merge conflict' },
  deleted: { color: '#f48771', label: 'Deleted' },
  modified: { color: '#e2c08d', label: 'Modified' },
  renamed: { color: '#73c991', label: 'Renamed' },
  untracked: { color: '#73c991', label: 'Untracked' },
};

export function buildNativeNodeDecorations(
  gitStatuses: ReadonlyMap<string, NativeGitStatus>,
  problems: ReadonlyMap<string, NativeProblemCounts>,
): Record<string, NodeDecorationPayload> {
  const filePaths = new Set([...gitStatuses.keys(), ...problems.keys()]);
  const decorations: Record<string, NodeDecorationPayload> = {};

  for (const filePath of filePaths) {
    const gitStatus = gitStatuses.get(filePath);
    const problemCounts = problems.get(filePath);
    const tooltipSections: Array<{ title: string; content: string }> = [];
    const decoration: NodeDecorationPayload = {};

    if (gitStatus) {
      const presentation = GIT_PRESENTATION[gitStatus];
      decoration.border = { color: presentation.color, width: 2, style: 'solid' };
      tooltipSections.push({ title: 'Source Control', content: presentation.label });
    }

    if (problemCounts && problemCounts.errors + problemCounts.warnings > 0) {
      const summary = formatProblemSummary(problemCounts);
      decoration.badge = {
        text: String(problemCounts.errors + problemCounts.warnings),
        color: '#ffffff',
        bgColor: problemCounts.errors > 0 ? '#f14c4c' : '#cca700',
        position: 'bottom-right',
        tooltip: summary,
      };
      tooltipSections.push({ title: 'Problems', content: summary });
    }

    if (tooltipSections.length > 0) {
      decoration.tooltip = { sections: tooltipSections };
      decorations[filePath] = decoration;
    }
  }

  return decorations;
}

function formatProblemSummary({ errors, warnings }: NativeProblemCounts): string {
  const parts: string[] = [];
  if (errors > 0) parts.push(`${errors} ${errors === 1 ? 'error' : 'errors'}`);
  if (warnings > 0) parts.push(`${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`);
  return parts.join(', ');
}
