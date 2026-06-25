import type { FullIndexAnalysisKind } from '../fullIndex';

interface FullIndexBackgroundScheduleState {
  fullIndexAnalysisPromise: Promise<void> | undefined;
  logError(message: string, error: unknown): void;
  runFullIndexAnalysis(
    runAnalysis: () => Promise<void>,
    kind: FullIndexAnalysisKind,
  ): Promise<void>;
  scheduledBackgroundAnalysis: ReturnType<typeof setTimeout> | undefined;
  setScheduledBackgroundAnalysis(
    scheduledBackgroundAnalysis: ReturnType<typeof setTimeout> | undefined,
  ): void;
}

export function scheduleFullIndexBackgroundAnalysis(
  state: FullIndexBackgroundScheduleState,
  runAnalysis: () => Promise<void>,
  shouldStart: () => boolean,
): void {
  if (state.scheduledBackgroundAnalysis !== undefined || state.fullIndexAnalysisPromise) {
    return;
  }

  state.setScheduledBackgroundAnalysis(setTimeout(() => {
    state.setScheduledBackgroundAnalysis(undefined);
    if (!shouldStart()) {
      return;
    }

    void state.runFullIndexAnalysis(runAnalysis, 'background').catch(error => {
      state.logError('[CodeGraphy] Background cache sync failed:', error);
    });
  }, 0));
}
