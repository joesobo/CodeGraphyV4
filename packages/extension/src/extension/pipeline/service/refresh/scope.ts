import {
  hasRequiredAnalysisCacheTiers,
  type IDiscoveredFile,
} from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../shared/graph/contracts';
import { createWorkspacePipelineAnalysisCacheTiers } from '../cache/tiers';
import type { WorkspacePipelineRefreshSource } from '../runtime/refresh';

interface CurrentAnalysisScopeInput {
  activePluginIds: readonly string[];
  discoveredFiles: readonly IDiscoveredFile[];
  disabledPlugins: Set<string>;
  lastFileAnalysis: WorkspacePipelineRefreshSource['_lastFileAnalysis'];
  nodeVisibility: Record<string, boolean>;
}

export function canReuseCurrentAnalysisForScope(input: CurrentAnalysisScopeInput): boolean {
  if (input.discoveredFiles.length === 0) {
    return false;
  }

  const requiredTiers = createWorkspacePipelineAnalysisCacheTiers(
    input.nodeVisibility,
    input.activePluginIds,
  ).required;

  return input.discoveredFiles.every((file) => {
    const analysis = input.lastFileAnalysis.get(file.relativePath);
    return Boolean(analysis && hasRequiredAnalysisCacheTiers(analysis, requiredTiers));
  });
}

export interface AnalysisScopeRefreshFacade {
  _buildGraphDataFromAnalysis(
    fileAnalysis: WorkspacePipelineRefreshSource['_lastFileAnalysis'],
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ): IGraphData;
  _lastDiscoveredDirectories: string[];
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileAnalysis: WorkspacePipelineRefreshSource['_lastFileAnalysis'];
  _lastWorkspaceRoot: string;
  _persistIndexMetadata(): Promise<void>;
}

interface RebuildAnalysisScopeInput {
  discoveredDirectories: readonly string[];
  discoveredFiles: IDiscoveredFile[];
  disabledPlugins: Set<string>;
  onProgress?: (progress: { phase: string; current: number; total: number }) => void;
  showOrphans: boolean;
  workspaceRoot: string;
}

export async function rebuildAnalysisScopeFromCurrentAnalysis(
  facade: AnalysisScopeRefreshFacade,
  input: RebuildAnalysisScopeInput,
): Promise<IGraphData> {
  input.onProgress?.({
    phase: 'Applying Scope',
    current: 0,
    total: input.discoveredFiles.length,
  });

  facade._lastDiscoveredDirectories = [...input.discoveredDirectories];
  facade._lastDiscoveredFiles = input.discoveredFiles;
  facade._lastWorkspaceRoot = input.workspaceRoot;

  const graphData = facade._buildGraphDataFromAnalysis(
    facade._lastFileAnalysis,
    input.workspaceRoot,
    input.showOrphans,
    input.disabledPlugins,
  );

  await facade._persistIndexMetadata();
  input.onProgress?.({
    phase: 'Applying Scope',
    current: input.discoveredFiles.length,
    total: input.discoveredFiles.length,
  });

  return graphData;
}
