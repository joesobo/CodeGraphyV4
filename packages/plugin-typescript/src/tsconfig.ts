/**
 * @fileoverview Helpers for loading tsconfig/jsconfig and extracting path resolution settings.
 * @module plugins/typescript/tsconfig
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { IPathResolverConfig } from './PathResolver';
import { getCompilerOptions, getBaseUrl, getPaths } from './configHelpers';

export { isRecord, getCompilerOptions, getBaseUrl, getPaths } from './configHelpers';

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
