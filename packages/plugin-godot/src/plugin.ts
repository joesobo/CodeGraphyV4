/**
 * @fileoverview GDScript (Godot) plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/godot
 */

import type {
  IPluginGraphScopeCapabilities,
  IPluginAnalysisContext,
} from '@codegraphy-dev/plugin-api';
import { GDScriptPathResolver } from './PathResolver';
import { collectGodotProjectRoots } from './projectRoot';
import manifest from '../codegraphy.json';
import { buildAnalysisContext } from './plugin/context';
import {
  readChangedAnalysisTargets,
  registerGodotFileMetadata,
} from './plugin/metadata';
import { detectRelations } from './plugin/relations';
import { extractSymbols } from './plugin/symbol/extract';
import {
  GODOT_SYMBOL_PLUGIN_KIND,
  GODOT_SYMBOL_SOURCE,
} from './plugin/symbol/godotKinds';
import type {
  GodotWorkspaceFile,
  IGDScriptAnalyzeFilePlugin,
} from './plugin/types';

export { GDScriptPathResolver } from './PathResolver';
export type { IGDScriptReference, GDScriptReferenceType } from './parser';

/**
 * Built-in plugin for GDScript (Godot) files.
 *
 * Detects dependencies in Godot GDScript files and resolves
 * resource paths (res://) to workspace-relative paths.
 *
 * Supports:
 * - preload() calls (compile-time loading)
 * - load() calls (runtime loading)
 * - extends statements (script inheritance)
 * - class_name usage (type annotations, static calls)
 * - ext_resource references in `.tscn` and `.tres` text resources
 * - project resource settings in `project.godot`
 *
 * @example
 * ```typescript
 * import { createGDScriptPlugin } from './plugins/godot';
 *
 * const plugin = createGDScriptPlugin();
 * registry.register(plugin, { builtIn: true });
 * ```
 */
class GDScriptPlugin implements IGDScriptAnalyzeFilePlugin {
  readonly id = manifest.id;
  readonly name = manifest.name;
  readonly version = manifest.version;
  readonly apiVersion = manifest.apiVersion;
  readonly supportedExtensions = manifest.supportedExtensions;
  readonly defaultFilters = manifest.defaultFilters;
  readonly sources = manifest.sources;

  contributeGraphScopeCapabilities(): IPluginGraphScopeCapabilities {
    const pluginSymbolNodeType = (pluginKind: string) =>
      `plugin:${GODOT_SYMBOL_SOURCE}:symbol:${pluginKind}`;

    return {
      nodeTypes: [
        'symbol:function',
        'symbol:enum',
        'symbol:constant',
        'variable',
        pluginSymbolNodeType(GODOT_SYMBOL_PLUGIN_KIND.className),
        pluginSymbolNodeType(GODOT_SYMBOL_PLUGIN_KIND.scene),
        pluginSymbolNodeType(GODOT_SYMBOL_PLUGIN_KIND.resource),
        pluginSymbolNodeType(GODOT_SYMBOL_PLUGIN_KIND.autoload),
        pluginSymbolNodeType(GODOT_SYMBOL_PLUGIN_KIND.sceneNode),
        pluginSymbolNodeType(GODOT_SYMBOL_PLUGIN_KIND.signal),
        pluginSymbolNodeType(GODOT_SYMBOL_PLUGIN_KIND.exportedProperty),
      ],
      edgeTypes: [
        'call',
        'load',
        'inherit',
        'reference',
        'contains',
        'codegraphy.gdscript:signal-connection',
      ],
    };
  }

  private projectRoots = new Set<string>();
  private resolver: GDScriptPathResolver | null = null;

  async initialize(workspaceRoot: string): Promise<void> {
    this.resolver = new GDScriptPathResolver(workspaceRoot);
    this.projectRoots = new Set();
    console.log('[CodeGraphy] GDScript plugin initialized');
  }

  async onPreAnalyze(
    files: GodotWorkspaceFile[],
    workspaceRoot: string,
    _context?: IPluginAnalysisContext,
  ): Promise<void> {
    this.resolver = new GDScriptPathResolver(workspaceRoot);
    this.projectRoots = collectGodotProjectRoots(files.map(({ relativePath }) => relativePath));

    for (const { relativePath, content } of files) {
      registerGodotFileMetadata(this.resolver, relativePath, content);
    }

    console.log(`[CodeGraphy] GDScript class_name map: ${this.resolver.getClassNameMap().size} entries, ${this.resolver.getFileNameMap().size} files indexed`);
  }

  async onFilesChanged(
    files: GodotWorkspaceFile[],
    workspaceRoot: string,
    _context?: IPluginAnalysisContext,
  ): Promise<string[]> {
    const resolver = this.getResolver(workspaceRoot);
    this.projectRoots = new Set([
      ...this.projectRoots,
      ...collectGodotProjectRoots(files.map(({ relativePath }) => relativePath)),
    ]);

    let requiresBroadReanalysis = false;
    let requiresTextResourceReanalysis = false;

    for (const { relativePath, content } of files) {
      const changes = registerGodotFileMetadata(resolver, relativePath, content);
      requiresBroadReanalysis ||= changes.classNamesChanged;
      requiresTextResourceReanalysis ||= changes.resourceUidChanged;
    }

    return readChangedAnalysisTargets(
      resolver,
      requiresBroadReanalysis,
      requiresTextResourceReanalysis,
    );
  }

  async analyzeFile(
    filePath: string,
    content: string,
    workspaceRoot: string,
    _context?: IPluginAnalysisContext,
  ) {
    const resolver = this.getResolver(workspaceRoot);
    const context = buildAnalysisContext(resolver, filePath, workspaceRoot, this.projectRoots);
    const relations = detectRelations(content, filePath, context);
    const symbols = extractSymbols(content, filePath, context.relativeFilePath);

    return {
      filePath,
      relations,
      ...(symbols.length > 0 ? { symbols } : {}),
    };
  }

  onUnload(): void {
    this.resolver?.clearClassNames();
    this.resolver = null;
    this.projectRoots = new Set();
  }

  private getResolver(workspaceRoot: string): GDScriptPathResolver {
    this.resolver ??= new GDScriptPathResolver(workspaceRoot);
    return this.resolver;
  }
}

export function createGDScriptPlugin(): IGDScriptAnalyzeFilePlugin {
  return new GDScriptPlugin();
}

// Default export for convenience
export default createGDScriptPlugin;
