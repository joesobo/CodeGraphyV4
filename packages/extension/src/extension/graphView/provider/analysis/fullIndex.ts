export interface FullIndexAnalysisCoordinator {
  runFullIndexAnalysis(runAnalysis: () => Promise<void>): Promise<void>;
  waitForFullIndexAnalysis(): Promise<boolean>;
}

class FullIndexAnalysisCoordinatorState implements FullIndexAnalysisCoordinator {
  private _fullIndexAnalysisPromise: Promise<void> | undefined;

  async waitForFullIndexAnalysis(): Promise<boolean> {
    if (!this._fullIndexAnalysisPromise) {
      return false;
    }

    try {
      await this._fullIndexAnalysisPromise;
    } catch {
      // The request that owns the reindex reports the failure. Competing
      // fire-and-forget webview loads should not create duplicate errors.
    }
    return true;
  }

  async runFullIndexAnalysis(
    runAnalysis: () => Promise<void>,
  ): Promise<void> {
    if (this._fullIndexAnalysisPromise) {
      await this._fullIndexAnalysisPromise;
      return;
    }

    const analysisPromise = runAnalysis();
    this._fullIndexAnalysisPromise = analysisPromise;
    try {
      await analysisPromise;
    } finally {
      if (this._fullIndexAnalysisPromise === analysisPromise) {
        this._fullIndexAnalysisPromise = undefined;
      }
    }
  }

}

export function createFullIndexAnalysisCoordinator(): FullIndexAnalysisCoordinator {
  return new FullIndexAnalysisCoordinatorState();
}
