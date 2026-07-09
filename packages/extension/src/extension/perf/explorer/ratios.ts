export interface CodeGraphyComparableMetrics {
  rename: number;
  create: number;
  delete: number;
  reveal: number;
}

export interface ExplorerObservableMetrics {
  explorerRenameMs: number;
  explorerCreateMs: number;
  explorerDeleteMs: number;
  explorerRevealMs: number;
}

export interface ExplorerRatios {
  renameRatio: number;
  createRatio: number;
  deleteRatio: number;
  revealRatio: number;
}

function requirePositiveMetric(value: number, name: keyof ExplorerObservableMetrics): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be finite and greater than zero`);
  }
  return value;
}

export function calculateExplorerRatios(
  codeGraphy: CodeGraphyComparableMetrics,
  explorer: ExplorerObservableMetrics,
): ExplorerRatios {
  return {
    renameRatio: codeGraphy.rename
      / requirePositiveMetric(explorer.explorerRenameMs, 'explorerRenameMs'),
    createRatio: codeGraphy.create
      / requirePositiveMetric(explorer.explorerCreateMs, 'explorerCreateMs'),
    deleteRatio: codeGraphy.delete
      / requirePositiveMetric(explorer.explorerDeleteMs, 'explorerDeleteMs'),
    revealRatio: codeGraphy.reveal
      / requirePositiveMetric(explorer.explorerRevealMs, 'explorerRevealMs'),
  };
}
