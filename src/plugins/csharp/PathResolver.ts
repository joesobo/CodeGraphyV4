/**
 * @fileoverview Resolves C# namespace references to file paths.
 * Uses convention-based mapping since C# doesn't have direct file imports.
 * @module plugins/csharp/PathResolver
 */

import * as path from 'path';
import * as fs from 'fs';
import { IDetectedUsing, IDetectedNamespace } from './ImportDetector';

/**
 * Configuration for C# path resolution.
 */
export interface ICSharpPathResolverConfig {
  /** Root namespace of the project (often matches project name) */
  rootNamespace?: string;
  /** Additional source directories to search */
  sourceDirs?: string[];
}

/**
 * Resolves C# namespaces to file system paths.
 * 
 * C# namespace resolution is convention-based:
 * - Namespace parts typically map to directory structure
 * - `MyProject.Services.UserService` → `Services/UserService.cs`
 * 
 * This resolver:
 * 1. Strips the root namespace prefix (if configured)
 * 2. Converts remaining parts to a directory path
 * 3. Searches for matching .cs files
 * 
 * @example
 * ```typescript
 * const resolver = new PathResolver('/workspace', { rootNamespace: 'MyApp' });
 * 
 * // MyApp.Services → Services/
 * resolver.resolve({ namespace: 'MyApp.Services', ... }, 'Program.cs');
 * ```
 */
export class PathResolver {
  private _workspaceRoot: string;
  private _config: ICSharpPathResolverConfig;
  private _namespaceToFileMap: Map<string, string> = new Map();

  constructor(workspaceRoot: string, config: ICSharpPathResolverConfig = {}) {
    this._workspaceRoot = workspaceRoot;
    this._config = {
      rootNamespace: config.rootNamespace,
      sourceDirs: config.sourceDirs || [''],
    };
  }

  /**
   * Registers a namespace declaration from a file.
   * This builds the namespace → file mapping for resolution.
   */
  registerNamespace(ns: IDetectedNamespace, filePath: string): void {
    // Normalize to workspace-relative
    const relativePath = filePath.startsWith(this._workspaceRoot)
      ? path.relative(this._workspaceRoot, filePath)
      : filePath;
    
    this._namespaceToFileMap.set(ns.name, relativePath.replace(/\\/g, '/'));
  }

  /**
   * Resolves a using directive to an absolute file path.
   * 
   * @param using - The detected using directive
   * @param fromFile - The file containing the using (for relative resolution)
   * @returns The resolved absolute path or null if external/unresolved
   */
  resolve(using: IDetectedUsing, _fromFile: string): string | null {
    const namespace = using.namespace;
    
    // Check if we have an exact namespace match from registered files
    if (this._namespaceToFileMap.has(namespace)) {
      const relativePath = this._namespaceToFileMap.get(namespace)!;
      return path.join(this._workspaceRoot, relativePath).replace(/\\/g, '/');
    }
    
    // Try to find a file that might contain this namespace
    // Convention: namespace parts map to directory structure
    const possiblePath = this._conventionBasedResolve(namespace);
    if (possiblePath) {
      return path.join(this._workspaceRoot, possiblePath).replace(/\\/g, '/');
    }
    
    // Check if it's a System or third-party namespace (external)
    if (this._isExternalNamespace(namespace)) {
      return null;
    }
    
    return null;
  }

  /**
   * Resolves a using directive to file paths, but only for types that are actually used.
   * This prevents false connections to files in the same namespace folder
   * that aren't actually used.
   * 
   * @param using - The detected using directive
   * @param fromFile - The file containing the using
   * @param usedTypes - Set of type names actually used in the file
   * @returns Array of resolved absolute paths (empty if not used/unresolved)
   */
  resolveWithTypes(using: IDetectedUsing, _fromFile: string, usedTypes: Set<string>): string[] {
    const namespace = using.namespace;
    
    // Check if it's a System or third-party namespace (external)
    if (this._isExternalNamespace(namespace)) {
      return [];
    }
    
    const results: string[] = [];
    
    // Check if we have an exact namespace match from registered files
    if (this._namespaceToFileMap.has(namespace)) {
      const relativePath = this._namespaceToFileMap.get(namespace)!;
      // Check if the file name (without extension) matches a used type
      const fileName = path.basename(relativePath, '.cs');
      if (usedTypes.has(fileName)) {
        results.push(path.join(this._workspaceRoot, relativePath).replace(/\\/g, '/'));
      }
    }
    
    // Try to resolve using used types
    // For each used type, check if it exists as a file in the namespace's likely location
    const resolvedPaths = this._resolveWithUsedTypes(namespace, usedTypes);
    results.push(...resolvedPaths);
    
    // Remove duplicates
    return [...new Set(results)];
  }

  /**
   * Resolves intra-namespace type usage (types from the same namespace, no using needed).
   * Looks for other files in the same namespace that define types we're using.
   * 
   * @param namespace - The namespace of the current file
   * @param fromFile - The current file path (to exclude from results)
   * @param usedTypes - Set of type names actually used in the file
   * @returns Array of resolved absolute paths to files in the same namespace
   */
  resolveIntraNamespace(namespace: string, fromFile: string, usedTypes: Set<string>): string[] {
    const results: string[] = [];
    const normalizedFromFile = fromFile.replace(/\\/g, '/');
    
    // Look for files that are registered with this exact namespace
    for (const [ns, filePath] of this._namespaceToFileMap.entries()) {
      if (ns === namespace) {
        const fullPath = path.join(this._workspaceRoot, filePath).replace(/\\/g, '/');
        if (fullPath !== normalizedFromFile) {
          const fileName = path.basename(filePath, '.cs');
          if (usedTypes.has(fileName)) {
            results.push(fullPath);
          }
        }
      }
    }
    
    // Also try convention-based resolution for types in the same namespace
    const resolvedPaths = this._resolveWithUsedTypes(namespace, usedTypes);
    for (const resolvedPath of resolvedPaths) {
      const normalizedPath = resolvedPath.replace(/\\/g, '/');
      if (normalizedPath !== normalizedFromFile && !results.includes(normalizedPath)) {
        results.push(normalizedPath);
      }
    }
    
    // For intra-namespace specifically, also check root source directories
    // This handles cases where the root namespace files are directly in src/
    for (const srcDir of this._config.sourceDirs || ['']) {
      for (const typeName of usedTypes) {
        const filePath = srcDir ? path.join(srcDir, typeName + '.cs') : typeName + '.cs';
        if (this._fileExists(filePath)) {
          const fullPath = path.join(this._workspaceRoot, filePath).replace(/\\/g, '/');
          if (fullPath !== normalizedFromFile && !results.includes(fullPath)) {
            results.push(fullPath);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Resolves namespace + used types to actual file paths.
   * For each used type, check if a matching .cs file exists in the namespace location.
   */
  private _resolveWithUsedTypes(namespace: string, usedTypes: Set<string>): string[] {
    const resolved: string[] = [];
    const parts = namespace.split('.');
    
    // Try different namespace strip levels (but not stripping ALL parts - 
    // that would match files from any namespace. Intra-namespace handles same-ns separately)
    for (let stripCount = 0; stripCount < parts.length; stripCount++) {
      const namespaceParts = parts.slice(stripCount);
      const nsPath = namespaceParts.join('/');
      
      for (const srcDir of this._config.sourceDirs || ['']) {
        for (const typeName of usedTypes) {
          // Check if TypeName.cs exists in the namespace path
          // When nsPath is empty (all parts stripped), look directly in srcDir
          const filePath = nsPath
            ? (srcDir ? path.join(srcDir, nsPath, typeName + '.cs') : path.join(nsPath, typeName + '.cs'))
            : (srcDir ? path.join(srcDir, typeName + '.cs') : typeName + '.cs');
          
          if (this._fileExists(filePath)) {
            resolved.push(path.join(this._workspaceRoot, filePath).replace(/\\/g, '/'));
          }
          
          // Also try without the last namespace part (it might be the type name)
          if (namespaceParts.length > 0 && namespaceParts[namespaceParts.length - 1] === typeName) {
            const parentPath = namespaceParts.slice(0, -1).join('/');
            const parentFilePath = parentPath
              ? (srcDir ? path.join(srcDir, parentPath, typeName + '.cs') : path.join(parentPath, typeName + '.cs'))
              : (srcDir ? path.join(srcDir, typeName + '.cs') : typeName + '.cs');
            
            if (this._fileExists(parentFilePath)) {
              resolved.push(path.join(this._workspaceRoot, parentFilePath).replace(/\\/g, '/'));
            }
          }
        }
      }
    }
    
    // Remove duplicates
    return [...new Set(resolved)];
  }

  /**
   * Attempts convention-based resolution.
   * Tries multiple strategies to map namespace to file path:
   * 1. With configured root namespace stripped
   * 2. With first N parts stripped (auto-detect root namespace)
   * 3. As full namespace path
   */
  private _conventionBasedResolve(namespace: string): string | null {
    const originalParts = namespace.split('.');
    
    // Strategy 1: Strip configured root namespace
    if (this._config.rootNamespace) {
      const rootParts = this._config.rootNamespace.split('.');
      if (originalParts.slice(0, rootParts.length).join('.') === this._config.rootNamespace) {
        const strippedParts = originalParts.slice(rootParts.length);
        const result = this._tryResolveParts(strippedParts);
        if (result) return result;
      }
    }
    
    // Strategy 2: Try stripping 0, 1, 2... parts to auto-detect root namespace
    // e.g., MyApp.Services → try Services/, then MyApp/Services/
    for (let stripCount = 0; stripCount < originalParts.length; stripCount++) {
      const parts = originalParts.slice(stripCount);
      if (parts.length === 0) continue;
      
      const result = this._tryResolveParts(parts);
      if (result) return result;
    }
    
    return null;
  }

  /**
   * Tries to resolve namespace parts to a file path.
   */
  private _tryResolveParts(parts: string[]): string | null {
    if (parts.length === 0) return null;
    
    // Try each source directory
    for (const srcDir of this._config.sourceDirs || ['']) {
      // Strategy A: Last part is a file name
      // e.g., Services.UserService → Services/UserService.cs
      const dirPath = parts.slice(0, -1).join('/');
      const fileName = parts[parts.length - 1] + '.cs';
      const filePath = srcDir ? path.join(srcDir, dirPath, fileName) : path.join(dirPath, fileName);
      
      if (this._fileExists(filePath)) {
        return filePath.replace(/\\/g, '/');
      }
      
      // Strategy B: Namespace is a folder, find any .cs file
      // e.g., Services → Services/*.cs
      const nsPath = parts.join('/');
      const asDir = srcDir ? path.join(srcDir, nsPath) : nsPath;
      
      if (this._directoryExists(asDir)) {
        const csFile = this._findCsFileInDir(asDir);
        if (csFile) {
          return csFile.replace(/\\/g, '/');
        }
      }
      
      // Strategy C: Try each part as a potential file
      // e.g., MyApp.Utils → try Utils.cs in src/
      if (parts.length >= 1) {
        const lastPart = parts[parts.length - 1];
        const simpleFile = srcDir 
          ? path.join(srcDir, lastPart + '.cs') 
          : lastPart + '.cs';
        
        if (this._fileExists(simpleFile)) {
          return simpleFile.replace(/\\/g, '/');
        }
      }
    }
    
    return null;
  }

  /**
   * Checks if a namespace is external (System, NuGet, etc.)
   */
  private _isExternalNamespace(namespace: string): boolean {
    const externalPrefixes = [
      'System',
      'Microsoft',
      'Newtonsoft',
      'NUnit',
      'Xunit',
      'Moq',
      'AutoMapper',
      'FluentValidation',
      'Serilog',
      'MediatR',
      'Dapper',
    ];
    
    return externalPrefixes.some(prefix => 
      namespace === prefix || namespace.startsWith(prefix + '.')
    );
  }

  /**
   * Checks if a file exists in the workspace.
   */
  private _fileExists(relativePath: string): boolean {
    try {
      const fullPath = path.join(this._workspaceRoot, relativePath);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Checks if a directory exists in the workspace.
   */
  private _directoryExists(relativePath: string): boolean {
    try {
      const fullPath = path.join(this._workspaceRoot, relativePath);
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Finds the first .cs file in a directory.
   */
  private _findCsFileInDir(relativePath: string): string | null {
    try {
      const fullPath = path.join(this._workspaceRoot, relativePath);
      const files = fs.readdirSync(fullPath);
      const csFile = files.find(f => f.endsWith('.cs'));
      if (csFile) {
        return path.join(relativePath, csFile);
      }
    } catch {
      // Directory doesn't exist or not readable
    }
    return null;
  }
}
