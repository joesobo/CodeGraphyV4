import type { NodeSizeMode } from '../../../../shared/settings/modes';

export function buildGraphDataLayoutKey(
  structureVersion: number,
  nodeSizeMode: NodeSizeMode,
): string {
  return `${nodeSizeMode}::${structureVersion}`;
}
