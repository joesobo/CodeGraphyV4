import { scheduleFullIndexBackgroundAnalysis } from './fullIndex/background';

export { canReplayStaleCache } from './fullIndex/cacheReplay';

interface FullIndexAnalysisLogger {
  logError(message: string, error: unknown): void;
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

export type FullIndexAnalysisKind = 'background' | 'foreground';

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
    scheduleFullIndexBackgroundAnalysis({
      fullIndexAnalysisPromise: this._fullIndexAnalysisPromise,
      logError: (message, error) => this._dependencies.logError(message, error),
      runFullIndexAnalysis: (nextRunAnalysis, kind) =>
        this.runFullIndexAnalysis(nextRunAnalysis, kind),
      scheduledBackgroundAnalysis: this._scheduledBackgroundAnalysis,
      setScheduledBackgroundAnalysis: scheduledBackgroundAnalysis => {
        this._scheduledBackgroundAnalysis = scheduledBackgroundAnalysis;
      },
    }, runAnalysis, shouldStart);
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
