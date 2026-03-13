/**
 * @fileoverview Helpers for loading tsconfig/jsconfig and extracting path resolution settings.
 * @module plugins/typescript/tsconfig
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { IPathResolverConfig } from './PathResolver';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getCompilerOptions(config: unknown): Record<string, unknown> {
  if (!isRecord(config)) return {};
  const compilerOptions = config.compilerOptions;
  return isRecord(compilerOptions) ? compilerOptions : {};
}

export function getBaseUrl(compilerOptions: Record<string, unknown>): string | undefined {
  const baseUrl = compilerOptions.baseUrl;
  return typeof baseUrl === 'string' ? baseUrl : undefined;
}

export function getPaths(
  compilerOptions: Record<string, unknown>
): Record<string, string[]> | undefined {
  const paths = compilerOptions.paths;
  if (!isRecord(paths)) return undefined;

  const entries: Array<[string, string[]]> = [];

  for (const [alias, targetValue] of Object.entries(paths)) {
    if (!Array.isArray(targetValue)) return undefined;
    if (!targetValue.every((item) => typeof item === 'string')) return undefined;
    entries.push([alias, targetValue]);
  }

  return Object.fromEntries(entries);
}

export function loadTsConfig(workspaceRoot: string): IPathResolverConfig {
  const configPaths = [
    path.join(workspaceRoot, 'tsconfig.json'),
    path.join(workspaceRoot, 'jsconfig.json'),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = ts.parseConfigFileTextToJson(configPath, content);
        if (parsed.error) {
          const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
          throw new Error(message);
        }

        const compilerOptions = getCompilerOptions(parsed.config);

        return {
          baseUrl: getBaseUrl(compilerOptions),
          paths: getPaths(compilerOptions),
        };
      }
    } catch (error) {
      console.warn(`[CodeGraphy] Failed to load ${configPath}:`, error);
    }
  }

  return {};
}
