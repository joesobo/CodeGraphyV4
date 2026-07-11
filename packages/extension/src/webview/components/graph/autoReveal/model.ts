import type { AutoRevealMode } from '../../../../shared/settings/modes';

interface ActiveFileAutoRevealOptions {
  filePath: string | null;
  mode: AutoRevealMode;
  nodeIds: ReadonlySet<string>;
  panToNodeById(this: void, nodeId: string): void;
  selectOnlyNode(this: void, nodeId: string): void;
}

export function applyActiveFileAutoReveal({
  filePath,
  mode,
  nodeIds,
  panToNodeById,
  selectOnlyNode,
}: ActiveFileAutoRevealOptions): void {
  if (!mode || !filePath || !nodeIds.has(filePath)) return;

  selectOnlyNode(filePath);
  if (mode === true) {
    panToNodeById(filePath);
  }
}
