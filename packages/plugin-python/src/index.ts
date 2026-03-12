/**
 * @fileoverview Python plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual rule modules in rules/.
 * @module plugins/python
 */

import type { IPlugin, IConnection } from '@codegraphy/plugin-api';
import * as fs from 'fs';
import * as path from 'path';
import { PathResolver, IPythonPathResolverConfig } from './PathResolver';
import manifest from '../codegraphy.json';

// Rule detect functions
import { detect as detectStandardImport } from './rules/standard-import';
import { detect as detectFromImport } from './rules/from-import';

export { PathResolver } from './PathResolver';
export type { IPythonPathResolverConfig, IDetectedImport } from './PathResolver';

/**
 * Built-in plugin for Python files.
 *
 * Uses regex-based parsing to detect Python imports,
 * then resolves them to file paths using Python module resolution rules.
 *
 * Supports:
 * - Python source files (.py)
 * - Type stub files (.pyi)
 * - Standard imports (import x)
 * - From imports (from x import y)
 * - Relative imports (from . import x, from .. import x)
 * - Package imports (__init__.py resolution)
 *
 * @example
 * ```typescript
 * import { createPythonPlugin } from './plugins/python';
 *
 * const plugin = createPythonPlugin();
 * registry.register(plugin, { builtIn: true });
 * ```
 */
export function createPythonPlugin(): IPlugin {
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
      const config = await loadPythonConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);
      console.log('[CodeGraphy] Python plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!resolver) {
        const config = await loadPythonConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const ctx = { resolver };

      return [
        ...detectStandardImport(content, filePath, ctx),
        ...detectFromImport(content, filePath, ctx),
      ];
    },

    onUnload(): void {
      resolver = null;
    },
  };
}

/**
 * Loads Python project configuration.
 * Looks for pyproject.toml, setup.cfg, or setup.py to determine source roots.
 */
async function loadPythonConfig(_workspaceRoot: string): Promise<IPythonPathResolverConfig> {
  const sourceRoots = new Set<string>();

  const pyprojectPath = path.join(_workspaceRoot, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    try {
      const pyproject = fs.readFileSync(pyprojectPath, 'utf8');
      for (const root of extractPyprojectSourceRoots(pyproject)) {
        sourceRoots.add(root);
      }
    } catch (error) {
      console.warn('[CodeGraphy] Failed to parse pyproject.toml:', error);
    }
  }

  const setupCfgPath = path.join(_workspaceRoot, 'setup.cfg');
  if (fs.existsSync(setupCfgPath)) {
    try {
      const setupCfg = fs.readFileSync(setupCfgPath, 'utf8');
      for (const root of extractSetupCfgSourceRoots(setupCfg)) {
        sourceRoots.add(root);
      }
    } catch (error) {
      console.warn('[CodeGraphy] Failed to parse setup.cfg:', error);
    }
  }

  return {
    sourceRoots: Array.from(sourceRoots),
    resolveInitFiles: true,
  };
}

function extractPyprojectSourceRoots(content: string): string[] {
  const roots = new Set<string>();

  for (const whereList of content.matchAll(/\bwhere\s*=\s*\[([^\]]*)\]/g)) {
    for (const raw of whereList[1].matchAll(/["']([^"']+)["']/g)) {
      const normalized = normalizeSourceRoot(raw[1]);
      if (normalized) roots.add(normalized);
    }
  }

  for (const whereSingle of content.matchAll(/\bwhere\s*=\s*["']([^"']+)["']/g)) {
    const normalized = normalizeSourceRoot(whereSingle[1]);
    if (normalized) roots.add(normalized);
  }

  for (const fromValue of content.matchAll(/\bfrom\s*=\s*["']([^"']+)["']/g)) {
    const normalized = normalizeSourceRoot(fromValue[1]);
    if (normalized) roots.add(normalized);
  }

  for (const packageDirBlock of content.matchAll(/\bpackage-dir\s*=\s*\{([^}]*)\}/gs)) {
    for (const entry of packageDirBlock[1].split(',')) {
      const match = entry.match(/^\s*["']?([^"']*)["']?\s*=\s*["']([^"']+)["']\s*$/);
      if (!match) continue;
      const key = match[1].trim();
      if (key.length > 0) continue;
      const normalized = normalizeSourceRoot(match[2]);
      if (normalized) roots.add(normalized);
    }
  }

  return Array.from(roots);
}

function extractSetupCfgSourceRoots(content: string): string[] {
  const roots = new Set<string>();

  const packagesFindSection = extractIniSection(content, 'options.packages.find');
  const whereValue = packagesFindSection ? extractIniValue(packagesFindSection, 'where') : null;
  if (whereValue) {
    for (const candidate of splitPathList(whereValue)) {
      const normalized = normalizeSourceRoot(candidate);
      if (normalized) roots.add(normalized);
    }
  }

  const optionsSection = extractIniSection(content, 'options');
  const packageDirValue = optionsSection ? extractIniValue(optionsSection, 'package_dir') : null;
  if (packageDirValue) {
    for (const line of packageDirValue.split('\n').map(v => v.trim()).filter(Boolean)) {
      // setup.cfg package_dir commonly uses:
      // package_dir =
      //   = src
      if (line.startsWith('=')) {
        const normalized = normalizeSourceRoot(line.slice(1).trim());
        if (normalized) roots.add(normalized);
        continue;
      }

      const match = line.match(/^["']?([^"']*)["']?\s*=\s*(.+)$/);
      if (!match) continue;
      const key = match[1].trim();
      if (key.length > 0) continue;
      const normalized = normalizeSourceRoot(match[2]);
      if (normalized) roots.add(normalized);
    }
  }

  return Array.from(roots);
}

function extractIniSection(content: string, sectionName: string): string | null {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?=\\n\\s*\\[|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1] : null;
}

function extractIniValue(section: string, keyName: string): string | null {
  const lines = section.split(/\r?\n/);
  const normalizedKey = keyName.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

    const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!match || match[1].toLowerCase() !== normalizedKey) continue;

    const values = [match[2].trim()];
    let cursor = i + 1;
    while (cursor < lines.length) {
      const continuation = lines[cursor];
      if (!/^\s+/.test(continuation)) break;
      const continuationTrimmed = continuation.trim();
      if (continuationTrimmed && !continuationTrimmed.startsWith('#') && !continuationTrimmed.startsWith(';')) {
        values.push(continuationTrimmed);
      }
      cursor++;
    }

    return values.join('\n');
  }

  return null;
}

function splitPathList(rawValue: string): string[] {
  return rawValue
    .split(/\r?\n|,/)
    .map(v => v.trim())
    .map(v => v.replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function normalizeSourceRoot(sourceRoot: string): string | null {
  const normalized = sourceRoot
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

  if (!normalized || normalized === '.') return null;
  return normalized;
}

// Default export for convenience
export default createPythonPlugin;
