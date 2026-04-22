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
  if (!shouldWarmGitAnalyzer(source, dependencies)) {
    return;
  }
  const analyzer = source._analyzer!;
  const createGitAnalyzer = dependencies.createGitAnalyzer!;

  const workspaceFolder = dependencies.getWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  await (source._installedPluginActivationPromise ?? Promise.resolve());

  if (!source._analyzerInitialized) {
    if (!source._analyzerInitPromise) {
      source._analyzerInitPromise = analyzer
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

  source._gitAnalyzer = createGitAnalyzer(
    source._context,
    analyzer.registry,
    workspaceFolder.uri.fsPath,
    getMergedExcludePatterns(source, analyzer, dependencies),
  );
}

function shouldWarmGitAnalyzer(
  source: GraphViewProviderTimelineMethodsSource,
  dependencies: CachedTimelineWarmupDependencies,
): boolean {
  return !source._gitAnalyzer && !!source._analyzer && !!dependencies.createGitAnalyzer;
}

function getMergedExcludePatterns(
  source: GraphViewProviderTimelineMethodsSource,
  analyzer: NonNullable<GraphViewProviderTimelineMethodsSource['_analyzer']>,
  dependencies: CachedTimelineWarmupDependencies,
): string[] {
  const disabledCustomPatterns = new Set(dependencies.getDisabledCustomFilterPatterns?.() ?? []);
  const disabledPluginPatterns = new Set(dependencies.getDisabledPluginFilterPatterns?.() ?? []);
  const pluginFilterPatterns = analyzer.getPluginFilterPatterns()
    .filter(pattern => !disabledPluginPatterns.has(pattern));
  const customFilterPatterns = source._filterPatterns
    .filter(pattern => !disabledCustomPatterns.has(pattern));

  return [
    ...new Set([
      ...DEFAULT_EXCLUDE_PATTERNS,
      ...pluginFilterPatterns,
      ...customFilterPatterns,
    ]),
  ];
}
