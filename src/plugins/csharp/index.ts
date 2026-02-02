/**
 * @fileoverview C# plugin for CodeGraphy.
 * Detects using directives in C# files and resolves them to file paths.
 * @module plugins/csharp
 */

import { IPlugin, IConnection } from '../../core/plugins';
import { ImportDetector, IDetectedNamespace } from './ImportDetector';
import { PathResolver, ICSharpPathResolverConfig } from './PathResolver';

export { ImportDetector } from './ImportDetector';
export type { IDetectedUsing, IDetectedNamespace } from './ImportDetector';
export { PathResolver } from './PathResolver';
export type { ICSharpPathResolverConfig } from './PathResolver';

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
  let detector: ImportDetector | null = null;
  let namespaceRegistry: Map<string, IDetectedNamespace[]> = new Map();

  return {
    id: 'codegraphy.csharp',
    name: 'C#',
    version: '1.0.0',
    supportedExtensions: ['.cs'],
    
    // Default excludes for C# projects
    defaultExclude: [
      'bin',
      'obj',
      '.vs',
      'packages',
      'TestResults',
      '*.Designer.cs',
      '*.generated.cs',
      'AssemblyInfo.cs',
    ],
    
    // Plugin-preferred colors for C# files
    fileColors: {
      '.cs': '#512BD4',           // C# purple
      '.csx': '#512BD4',          // C# script
      '.csproj': '#512BD4',       // Project file
      '.sln': '#854CC7',          // Solution file - lighter purple
      '.props': '#6B7280',        // MSBuild props
      '.targets': '#6B7280',      // MSBuild targets
      'Directory.Build.props': '#6B7280',
      'Directory.Build.targets': '#6B7280',
      'global.json': '#512BD4',
      'nuget.config': '#004880',  // NuGet blue
      '.editorconfig': '#6B7280',
      'appsettings.json': '#F7DF1E', // JSON yellow
      'appsettings.Development.json': '#F7DF1E',
      'launchSettings.json': '#F7DF1E',
    },

    async initialize(workspaceRoot: string): Promise<void> {
      detector = new ImportDetector();
      
      // Load project config if available
      const config = await loadCSharpConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      namespaceRegistry = new Map();
      
      console.log('[CodeGraphy] C# plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!detector || !resolver) {
        detector = new ImportDetector();
        const config = await loadCSharpConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const { usings, namespaces } = detector.detect(content, filePath);
      
      // Register namespaces from this file for cross-file resolution
      for (const ns of namespaces) {
        resolver.registerNamespace(ns, filePath);
        
        if (!namespaceRegistry.has(filePath)) {
          namespaceRegistry.set(filePath, []);
        }
        namespaceRegistry.get(filePath)!.push(ns);
      }
      
      // Extract type names actually used in the file body
      // Look for: new TypeName(), TypeName.Method(), : TypeName, etc.
      const usedTypes = extractUsedTypes(content);
      
      const connections: IConnection[] = [];

      for (const using of usings) {
        // For each using, find all files that match used types from this namespace
        const resolvedPaths = resolver.resolveWithTypes(using, filePath, usedTypes);
        
        for (const resolvedPath of resolvedPaths) {
          // Build specifier string
          let specifier = using.namespace;
          if (using.isGlobal) specifier = `global using ${specifier}`;
          else if (using.isStatic) specifier = `using static ${specifier}`;
          else if (using.alias) specifier = `using ${using.alias} = ${specifier}`;
          else specifier = `using ${specifier}`;
          
          connections.push({
            specifier,
            resolvedPath,
            type: 'static',
          });
        }
      }
      
      // Also check for intra-namespace type usage (same namespace, no using needed)
      // For each namespace this file declares, look for other files in that namespace
      // that define types we're using
      for (const ns of namespaces) {
        const intraNsConnections = resolver.resolveIntraNamespace(ns.name, filePath, usedTypes);
        for (const resolvedPath of intraNsConnections) {
          connections.push({
            specifier: `[same namespace: ${ns.name}]`,
            resolvedPath,
            type: 'static',
          });
        }
      }

      return connections;
    },

    dispose(): void {
      resolver = null;
      detector = null;
      namespaceRegistry.clear();
    },
  };
}

/**
 * Extracts type names that are actually used in C# code.
 * Looks for patterns like:
 * - new TypeName(...)
 * - TypeName.Method(...)
 * - TypeName.Property
 * - : TypeName (inheritance/implementation)
 * - TypeName variable
 * - <TypeName> (generics)
 */
function extractUsedTypes(content: string): Set<string> {
  const types = new Set<string>();
  
  // Remove comments and strings to avoid false positives
  const cleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '')  // Multi-line comments
    .replace(/\/\/.*/g, '')             // Single-line comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '')  // Double-quoted strings
    .replace(/@"(?:[^"]|"")*"/g, '')    // Verbatim strings
    .replace(/'(?:[^'\\]|\\.)*'/g, ''); // Char literals
  
  // Pattern: new TypeName(
  const newPattern = /\bnew\s+([A-Z][A-Za-z0-9_]*)\s*[(<]/g;
  let match;
  while ((match = newPattern.exec(cleanContent)) !== null) {
    types.add(match[1]);
  }
  
  // Pattern: TypeName.Something (static access)
  const staticPattern = /\b([A-Z][A-Za-z0-9_]*)\s*\.\s*[A-Za-z_]/g;
  while ((match = staticPattern.exec(cleanContent)) !== null) {
    // Exclude common non-type words
    const typeName = match[1];
    if (!['String', 'Console', 'Math', 'Convert', 'Guid', 'DateTime', 'TimeSpan', 'Task', 'File', 'Path', 'Directory', 'Environment'].includes(typeName)) {
      types.add(typeName);
    }
  }
  
  // Pattern: : TypeName (inheritance) or : ITypeName (interface)
  const inheritPattern = /:\s*([A-Z][A-Za-z0-9_]*)/g;
  while ((match = inheritPattern.exec(cleanContent)) !== null) {
    types.add(match[1]);
  }
  
  // Pattern: <TypeName> (generics)
  const genericPattern = /<\s*([A-Z][A-Za-z0-9_]*)\s*>/g;
  while ((match = genericPattern.exec(cleanContent)) !== null) {
    types.add(match[1]);
  }
  
  // Pattern: TypeName variableName (declarations)
  const declPattern = /\b([A-Z][A-Za-z0-9_]*)\s+[a-z_][A-Za-z0-9_]*\s*[=;,)]/g;
  while ((match = declPattern.exec(cleanContent)) !== null) {
    const typeName = match[1];
    // Exclude C# keywords that look like types
    if (!['String', 'Object', 'Boolean', 'Int32', 'Int64', 'Double', 'Decimal', 'Byte', 'Char', 'Void'].includes(typeName)) {
      types.add(typeName);
    }
  }
  
  return types;
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
