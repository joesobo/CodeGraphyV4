/**
 * @fileoverview C# plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual rule modules in rules/.
 * @module plugins/csharp
 */

import { IPlugin, IConnection } from '../../extension/src/core/plugins';
import { PathResolver, ICSharpPathResolverConfig } from './PathResolver';
import { parseContent, extractUsedTypes, CSharpRuleContext } from './parser';
import manifest from '../codegraphy.json';

// Rule detect functions
import { detect as detectUsingDirective } from './rules/using-directive';
import { detect as detectTypeUsage } from './rules/type-usage';

export { PathResolver } from './PathResolver';
export type { ICSharpPathResolverConfig } from './PathResolver';
export type { IDetectedUsing, IDetectedNamespace } from './parser';

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

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    rules: manifest.rules,
    fileColors: manifest.fileColors,

    async initialize(workspaceRoot: string): Promise<void> {
      const config = await loadCSharpConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      console.log('[CodeGraphy] C# plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!resolver) {
        const config = await loadCSharpConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      // Parse once, share results with all rules
      const { usings, namespaces } = parseContent(content);

      // Register namespaces for cross-file resolution
      for (const ns of namespaces) {
        resolver.registerNamespace(ns, filePath);
      }

      const usedTypes = extractUsedTypes(content);
      const ctx: CSharpRuleContext = { resolver, usings, namespaces, usedTypes };

      return [
        ...detectUsingDirective(content, filePath, ctx),
        ...detectTypeUsage(content, filePath, ctx),
      ];
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
