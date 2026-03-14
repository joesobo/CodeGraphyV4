/**
 * @fileoverview Resolves C# namespace references to file paths.
 * Uses convention-based mapping since C# does not have direct file imports.
 * @module plugins/csharp/PathResolver
 */

import type { IDetectedNamespace, IDetectedUsing } from './parserTypes';
import { conventionBasedResolve } from './pathResolverConvention';
import {
  createResolverFsOps,
  toWorkspaceAbsolute,
  toWorkspaceRelative,
  type ResolverFsOps,
} from './pathResolverFs';
import { resolveUsingWithTypes } from './pathResolverResolveWithTypes';
import { resolveIntraNamespaceTypes } from './pathResolverResolveIntraNamespace';

export interface ICSharpPathResolverConfig {
  rootNamespace?: string;
  sourceDirs?: string[];
}

type ResolvedPathResolverConfig = {
  rootNamespace?: string;
  sourceDirs: string[];
};

function normalizeSourceDirs(sourceDirs: string[] | undefined): string[] {
  if (!sourceDirs || sourceDirs.length === 0) {
    return [''];
  }
  return sourceDirs;
}

export class PathResolver {
  private _workspaceRoot: string;
  private _config: ResolvedPathResolverConfig;
  private _namespaceToFileMap = new Map<string, string>();
  private _fsOps: ResolverFsOps;

  constructor(workspaceRoot: string, config: ICSharpPathResolverConfig = {}) {
    this._workspaceRoot = workspaceRoot;
    this._config = {
      rootNamespace: config.rootNamespace,
      sourceDirs: normalizeSourceDirs(config.sourceDirs),
    };
    this._fsOps = createResolverFsOps(workspaceRoot);
  }

  registerNamespace(ns: IDetectedNamespace, filePath: string): void {
    const relativePath = toWorkspaceRelative(this._workspaceRoot, filePath);
    this._namespaceToFileMap.set(ns.name, relativePath);
  }

  resolve(usingDirective: IDetectedUsing, _fromFile: string): string | null {
    const registeredRelativePath = this._namespaceToFileMap.get(usingDirective.namespace);
    if (registeredRelativePath) {
      return toWorkspaceAbsolute(this._workspaceRoot, registeredRelativePath);
    }

    const resolvedByConvention = conventionBasedResolve({
      namespace: usingDirective.namespace,
      rootNamespace: this._config.rootNamespace,
      sourceDirs: this._config.sourceDirs,
      fsOps: this._fsOps,
    });
    if (resolvedByConvention) {
      return toWorkspaceAbsolute(this._workspaceRoot, resolvedByConvention);
    }

    return null;
  }

  resolveWithTypes(usingDirective: IDetectedUsing, _fromFile: string, usedTypes: Set<string>): string[] {
    return resolveUsingWithTypes({
      usingDirective,
      usedTypes,
      workspaceRoot: this._workspaceRoot,
      sourceDirs: this._config.sourceDirs,
      namespaceToFileMap: this._namespaceToFileMap,
      fsOps: this._fsOps,
    });
  }

  resolveIntraNamespace(namespace: string, fromFile: string, usedTypes: Set<string>): string[] {
    return resolveIntraNamespaceTypes({
      namespace,
      fromFile,
      usedTypes,
      workspaceRoot: this._workspaceRoot,
      sourceDirs: this._config.sourceDirs,
      namespaceToFileMap: this._namespaceToFileMap,
      fsOps: this._fsOps,
    });
  }
}
