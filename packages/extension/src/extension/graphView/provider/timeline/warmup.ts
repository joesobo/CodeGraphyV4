import { DEFAULT_EXCLUDE_PATTERNS } from '../../../config/defaults';
import type { GraphViewProviderTimelineMethodDependencies, GraphViewProviderTimelineMethodsSource } from './contracts';

export async function ensureGitAnalyzerForCachedTimeline(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: Pick<
    GraphViewProviderTimelineMethodDependencies,
    'createGitAnalyzer' | 'getWorkspaceFolder'
  >,
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

  const mergedExclude = [
    ...new Set([
      ...DEFAULT_EXCLUDE_PATTERNS,
      ...source._analyzer.getPluginFilterPatterns(),
      ...source._filterPatterns,
    ]),
  ];

  source._gitAnalyzer = dependencies.createGitAnalyzer(
    source._context,
    source._analyzer.registry,
    workspaceFolder.uri.fsPath,
    mergedExclude,
  );
}
