import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import manifest from '../codegraphy.json';

type SvelteAnalysisRuntime = typeof import('./analysis.js');

let svelteAnalysisRuntimePromise: Promise<SvelteAnalysisRuntime> | undefined;

function loadSvelteAnalysisRuntime(): Promise<SvelteAnalysisRuntime> {
  svelteAnalysisRuntimePromise ??= import('./analysis.js');
  return svelteAnalysisRuntimePromise;
}

export function createSveltePlugin(): IPlugin {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    updateImpact: manifest.updateImpact as IPlugin['updateImpact'],
    fileColors: manifest.fileColors,
    contributeGraphScopeCapabilities: () => ({
      edgeTypes: ['import', 'type-import', 'call'],
    }),
    async analyzeFile(filePath: string, content: string): Promise<IFileAnalysisResult> {
      const runtime = await loadSvelteAnalysisRuntime();
      return runtime.analyzeSvelteComponent(filePath, content);
    },
  };
}

export default createSveltePlugin;
