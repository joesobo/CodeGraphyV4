/**
 * @fileoverview C# plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/csharp
 */

import type { IPlugin } from '@codegraphy-vscode/plugin-api';
import { PathResolver, ICSharpPathResolverConfig } from './PathResolver';
import { parseContent } from './parserContent';
import type { CSharpRuleContext } from './parserTypes';
import { extractUsedTypes } from './parserUsedTypes';
import type { CSharpFileAnalysisResult } from './analysis';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectUsingDirective } from './sources/using-directive';
import { detect as detectTypeUsage } from './sources/type-usage';

export { PathResolver } from './PathResolver';
export type { ICSharpPathResolverConfig } from './PathResolver';
export type { IDetectedUsing, IDetectedNamespace } from './parserTypes';

/**
 * Built-in plugin for C# files.
 *
 * Uses regex-based parsing to detect C# using directives,
 * then resolves them to file paths using namespace conventions.
 *
 * Supports:
 * - C# source files (.cs)
 * - Using directives (regular, static, global, alias)
 * - Namespace declarations for cross-file resolution
 * - Convention-based path mapping
 *
 * @example
 * ```typescript
 * import { createCSharpPlugin } from './plugins/csharp';
 *
 * const plugin = createCSharpPlugin();
 * registry.register(plugin, { builtIn: true });
 * ```
 */
export interface ICSharpAnalyzeFilePlugin extends IPlugin {
  analyzeFile(
    filePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<CSharpFileAnalysisResult>;
}

export function createCSharpPlugin(): ICSharpAnalyzeFilePlugin {
  let resolver: PathResolver | null = null;
  let resolverWorkspaceRoot: string | null = null;

  const ensureResolver = async (workspaceRoot: string): Promise<PathResolver> => {
    if (!resolver || resolverWorkspaceRoot !== workspaceRoot) {
      const config = await loadCSharpConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      resolverWorkspaceRoot = workspaceRoot;
    }

    return resolver;
  };

  const analyzeFile = async (
    filePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<CSharpFileAnalysisResult> => {
    const activeResolver = await ensureResolver(workspaceRoot);

    const { usings, namespaces } = parseContent(content);
    const usedTypes = extractUsedTypes(content);
    const ctx: CSharpRuleContext = {
      resolver: activeResolver,
      usings,
      namespaces,
      usedTypes,
    };
    const relations = [
      ...detectUsingDirective(content, filePath, ctx),
      ...detectTypeUsage(content, filePath, ctx),
    ];

    return {
      filePath,
      relations,
    };
  };

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    sources: manifest.sources,
    fileColors: manifest.fileColors,

    async initialize(workspaceRoot: string): Promise<void> {
      await ensureResolver(workspaceRoot);
      console.log('[CodeGraphy] C# plugin initialized');
    },

    async onPreAnalyze(
      files: Array<{ absolutePath: string; relativePath: string; content: string }>,
      workspaceRoot: string,
    ): Promise<void> {
      const config = await loadCSharpConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      resolverWorkspaceRoot = workspaceRoot;

      for (const { absolutePath, content } of files) {
        const { namespaces } = parseContent(content);
        for (const namespace of namespaces) {
          resolver.registerNamespace(namespace, absolutePath);
        }
      }
    },

    analyzeFile,

    onUnload(): void {
      resolver = null;
      resolverWorkspaceRoot = null;
    },
  };
}

/**
 * Loads C# project configuration.
 * Attempts to find root namespace from .csproj files.
 */
async function loadCSharpConfig(_workspaceRoot: string): Promise<ICSharpPathResolverConfig> {
  // For now, use default config
  // Future: parse .csproj for RootNamespace
  return {
    sourceDirs: ['', 'src'],
  };
}

// Default export for convenience
export default createCSharpPlugin;
