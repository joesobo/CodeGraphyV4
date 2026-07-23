import type {
  IAnalysisFile,
  IPlugin,
  IPluginAnalysisContext,
  IPluginGraphScopeCapabilities,
} from '@codegraphy-dev/plugin-api';
import { analyzeUnitySerializedFile } from './analysis';
import { buildUnityGuidMap, buildUnityGuidMapFromWorkspace, registerUnityGuid } from './guidMap';
import { createUnityNodeTypes } from './graph/types';
import { manifest } from './metadata';

const UNITY_GRAPH_SCOPE_NODE_TYPES = [
  'plugin:codegraphy.unity:symbol:game-object',
  'plugin:codegraphy.unity:symbol:component',
] as const;

class UnityPlugin implements IPlugin {
  readonly id = manifest.id;
  readonly name = manifest.name;
  readonly version = manifest.version;
  readonly apiVersion = manifest.apiVersion;
  readonly supportedExtensions = manifest.supportedExtensions;
  readonly defaultFilters = manifest.defaultFilters;
  readonly updateImpact = manifest.updateImpact;
  readonly sources = manifest.sources;

  private guidToAssetPath = new Map<string, string>();

  contributeNodeTypes() {
    return createUnityNodeTypes();
  }

  contributeGraphScopeCapabilities(): IPluginGraphScopeCapabilities {
    return {
      nodeTypes: UNITY_GRAPH_SCOPE_NODE_TYPES,
      edgeTypes: ['contains', 'reference', 'event'],
    };
  }

  async onPreAnalyze(
    files: IAnalysisFile[],
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<void> {
    this.guidToAssetPath = await buildUnityGuidMapForAnalysis(files, workspaceRoot, context);
  }

  async onFilesChanged(
    files: IAnalysisFile[],
    _workspaceRoot: string,
    _context?: IPluginAnalysisContext,
  ): Promise<string[]> {
    for (const file of files) {
      registerUnityGuid(this.guidToAssetPath, file);
    }

    return files
      .filter((file) => isUnitySerializedAsset(file.relativePath))
      .map((file) => file.absolutePath);
  }

  async analyzeFile(
    filePath: string,
    content: string,
    workspaceRoot: string,
    _context?: IPluginAnalysisContext,
  ) {
    return analyzeUnitySerializedFile(filePath, content, {
      workspaceRoot,
      resolveGuid: (guid) => this.guidToAssetPath.get(guid),
    });
  }

  onUnload(): void {
    this.guidToAssetPath = new Map();
  }
}

function isUnitySerializedAsset(filePath: string): boolean {
  return /\.(asset|mat|prefab|unity)$/.test(filePath);
}

export function createUnityPlugin(): IPlugin {
  return new UnityPlugin();
}

async function buildUnityGuidMapForAnalysis(
  files: readonly IAnalysisFile[],
  workspaceRoot: string,
  context: IPluginAnalysisContext | undefined,
): Promise<Map<string, string>> {
  const guidToAssetPath = buildUnityGuidMap(files);
  if (!context?.fileSystem) {
    return guidToAssetPath;
  }

  const workspaceGuidToAssetPath = await buildUnityGuidMapFromWorkspace(
    workspaceRoot,
    context.fileSystem,
  );
  return new Map([...guidToAssetPath, ...workspaceGuidToAssetPath]);
}

export default createUnityPlugin;
