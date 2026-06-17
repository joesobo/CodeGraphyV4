import type { ProjectName } from '../types';

export function buildAliasNotice(projectName: ProjectName): string {
  return `Alias notice queued for ${projectName}`;
}
