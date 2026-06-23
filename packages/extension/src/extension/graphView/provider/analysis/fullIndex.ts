interface FullIndexAnalysisLogger {
  logError(message: string, error: unknown): void;
}

interface ReplayableCacheAnalyzer {
  getIndexStatus?(): { freshness: string };
  loadCachedGraph?: unknown;
}

interface ReplayableCacheSource {
  _analyzer?: ReplayableCacheAnalyzer;
}

export interface FullIndexAnalysisCoordinator {
  runAfterFullIndexAnalysis(runAnalysis: () => Promise<void>): Promise<void>;
  runFullIndexAnalysis(runAnalysis: () => Promise<void>): Promise<void>;
  runFullIndexAnalysisInBackground(
    runAnalysis: () => Promise<void>,
    shouldStart?: () => boolean,
  ): void;
  waitForFullIndexAnalysis(): Promise<boolean>;
  waitForForegroundFullIndexAnalysis(): Promise<boolean>;
}

type FullIndexAnalysisKind = 'background' | 'foreground';

class FullIndexAnalysisCoordinatorState implements FullIndexAnalysisCoordinator {
  private _fullIndexAnalysisPromise: Promise<void> | undefined;
  private _fullIndexAnalysisKind: FullIndexAnalysisKind | undefined;
  private _scheduledBackgroundAnalysis: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly _dependencies: FullIndexAnalysisLogger,
  ) {}

  private _clearScheduledBackgroundAnalysis(): void {
    if (this._scheduledBackgroundAnalysis === undefined) {
      return;
    }

    clearTimeout(this._scheduledBackgroundAnalysis);
    this._scheduledBackgroundAnalysis = undefined;
  }

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

  async waitForForegroundFullIndexAnalysis(): Promise<boolean> {
    if (this._fullIndexAnalysisKind === 'background') {
      return false;
    }

    return this.waitForFullIndexAnalysis();
  }

  async runFullIndexAnalysis(
    runAnalysis: () => Promise<void>,
    kind: FullIndexAnalysisKind = 'foreground',
  ): Promise<void> {
    if (kind === 'foreground') {
      this._clearScheduledBackgroundAnalysis();
    }

    if (this._fullIndexAnalysisPromise) {
      await this._fullIndexAnalysisPromise;
      return;
    }

    const analysisPromise = runAnalysis();
    this._fullIndexAnalysisPromise = analysisPromise;
    this._fullIndexAnalysisKind = kind;
    try {
      await analysisPromise;
    } finally {
      if (this._fullIndexAnalysisPromise === analysisPromise) {
        this._fullIndexAnalysisPromise = undefined;
        this._fullIndexAnalysisKind = undefined;
      }
    }
  }

  runFullIndexAnalysisInBackground(
    runAnalysis: () => Promise<void>,
    shouldStart: () => boolean = () => true,
  ): void {
    if (this._scheduledBackgroundAnalysis !== undefined || this._fullIndexAnalysisPromise) {
      return;
    }

    this._scheduledBackgroundAnalysis = setTimeout(() => {
      this._scheduledBackgroundAnalysis = undefined;
      if (!shouldStart()) {
        return;
      }

      void this.runFullIndexAnalysis(runAnalysis, 'background').catch(error => {
        this._dependencies.logError('[CodeGraphy] Background cache sync failed:', error);
      });
    }, 0);
  }

  async runAfterFullIndexAnalysis(
    runAnalysis: () => Promise<void>,
  ): Promise<void> {
    this._clearScheduledBackgroundAnalysis();
    await this.waitForFullIndexAnalysis();
    await runAnalysis();
  }
}

export function createFullIndexAnalysisCoordinator(
  dependencies: FullIndexAnalysisLogger,
): FullIndexAnalysisCoordinator {
  return new FullIndexAnalysisCoordinatorState(dependencies);
}

export function canReplayStaleCache(source: ReplayableCacheSource): boolean {
  return source._analyzer?.getIndexStatus?.().freshness === 'stale'
    && typeof source._analyzer.loadCachedGraph === 'function';
}
