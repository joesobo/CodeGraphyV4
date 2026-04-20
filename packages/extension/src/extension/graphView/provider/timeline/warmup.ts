import { DEFAULT_EXCLUDE_PATTERNS } from '../../../config/defaults';
import type { GraphViewProviderTimelineMethodDependencies, GraphViewProviderTimelineMethodsSource } from './contracts';

type CachedTimelineWarmupDependencies = Pick<
  GraphViewProviderTimelineMethodDependencies,
  'createGitAnalyzer' | 'getWorkspaceFolder'
> &
  Partial<
    Pick<
      GraphViewProviderTimelineMethodDependencies,
      'getDisabledCustomFilterPatterns' | 'getDisabledPluginFilterPatterns'
    >
  >;

export async function ensureGitAnalyzerForCachedTimeline(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: CachedTimelineWarmupDependencies,
): Promise<void> {
  if (source._gitAnalyzer || !source._analyzer) {
    return;
  }

  if (!dependencies.createGitAnalyzer) {
    return;
  }

  const workspaceFolder = dependencies.getWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  await (source._installedPluginActivationPromise ?? Promise.resolve());

  if (!source._analyzerInitialized) {
    if (!source._analyzerInitPromise) {
      source._analyzerInitPromise = source._analyzer
        .initialize()
        .then(() => {
          source._analyzerInitialized = true;
        })
        .finally(() => {
          source._analyzerInitPromise = undefined;
        });
    }

    await source._analyzerInitPromise;
  }

  const disabledCustomPatterns = new Set(dependencies.getDisabledCustomFilterPatterns?.() ?? []);
  const disabledPluginPatterns = new Set(dependencies.getDisabledPluginFilterPatterns?.() ?? []);
  const pluginFilterPatterns = source._analyzer.getPluginFilterPatterns()
    .filter(pattern => !disabledPluginPatterns.has(pattern));
  const customFilterPatterns = source._filterPatterns
    .filter(pattern => !disabledCustomPatterns.has(pattern));
  const mergedExclude = [
    ...new Set([
      ...DEFAULT_EXCLUDE_PATTERNS,
      ...pluginFilterPatterns,
      ...customFilterPatterns,
    ]),
  ];

  source._gitAnalyzer = dependencies.createGitAnalyzer(
    source._context,
    source._analyzer.registry,
    workspaceFolder.uri.fsPath,
    mergedExclude,
  );
}
