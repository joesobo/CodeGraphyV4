/**
 * @fileoverview C# plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/csharp
 */

import type {
  IPlugin,
  IConnection,
  IFileAnalysisResult,
} from '@codegraphy-vscode/plugin-api';
import { PathResolver, ICSharpPathResolverConfig } from './PathResolver';
import { parseContent } from './parserContent';
import type { CSharpRuleContext } from './parserTypes';
import { extractUsedTypes } from './parserUsedTypes';
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
export function createCSharpPlugin(): IPlugin {
  let resolver: PathResolver | null = null;

  function toFileAnalysisResult(
    filePath: string,
    connections: IConnection[],
  ): IFileAnalysisResult {
    return {
      filePath,
      relations: connections.map(connection => ({
        kind: connection.kind,
        sourceId: connection.sourceId,
        specifier: connection.specifier,
        type: connection.type,
        variant: connection.variant,
        resolvedPath: connection.resolvedPath,
        metadata: connection.metadata,
        fromFilePath: filePath,
        toFilePath: connection.resolvedPath,
      })),
    };
  }

  async function detectCSharpConnections(
    filePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IConnection[]> {
    if (!resolver) {
      const config = await loadCSharpConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
    }

    const { usings, namespaces } = parseContent(content);

    for (const ns of namespaces) {
      resolver.registerNamespace(ns, filePath);
    }

    const usedTypes = extractUsedTypes(content);
    const ctx: CSharpRuleContext = { resolver, usings, namespaces, usedTypes };

    return [
      ...detectUsingDirective(content, filePath, ctx),
      ...detectTypeUsage(content, filePath, ctx),
    ];
  }

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
      const config = await loadCSharpConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      console.log('[CodeGraphy] C# plugin initialized');
    },

    async analyzeFile(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IFileAnalysisResult> {
      return toFileAnalysisResult(
        filePath,
        await detectCSharpConnections(filePath, content, workspaceRoot),
      );
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      return detectCSharpConnections(filePath, content, workspaceRoot);
    },

    onUnload(): void {
      resolver = null;
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
