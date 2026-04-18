import type { DagMode } from '../../../../../shared/settings/modes';

export function createGraphViewProviderRuntimeFlagState(): {
  _analyzerInitialized: boolean;
  _analysisRequestId: number;
  _depthMode: boolean;
  _dagMode: DagMode;
  _timelineActive: boolean;
  _firstAnalysis: boolean;
  _webviewReadyNotified: boolean;
  _installedPluginActivationPromise: Promise<void>;
} {
  return {
    _analyzerInitialized: false,
    _analysisRequestId: 0,
    _depthMode: false,
    _dagMode: null,
    _timelineActive: false,
    _firstAnalysis: true,
    _webviewReadyNotified: false,
    _installedPluginActivationPromise: Promise.resolve(),
  };
}
