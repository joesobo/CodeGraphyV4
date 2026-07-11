import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const EXTENSION_PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const WEBVIEW_SOURCE_ROOT = path.join(EXTENSION_PACKAGE_ROOT, 'src', 'webview');
const SOURCE_EXTENSIONS = new Set(['.css', '.ts', '.tsx']);

const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const VSCODE_TOKEN_PATTERN = /var\(--vscode-/g;

const GRAPH_DATA_COLOR_ALLOW_LIST = new Set([
  'src/webview/app/rulePrompt/model.ts',
  'src/webview/components/graph/contextActions/builtin/effects.ts',
  'src/webview/components/graph/rendering/node/decorationBadge.ts',
  'src/webview/components/graph/runtime/use/indicators/nodeDecorations.ts',
  'src/webview/components/graph/model/link/build.ts',
  'src/webview/components/graph/model/node/display.ts',
  'src/webview/components/legends/panel/section/createRow.tsx',
  'src/webview/export/shared/context.ts',
  'src/webview/export/svg/link/document.ts',
  'src/webview/pluginHost/api/drawing.ts',
  'src/webview/store/messageHandlers/fileMutation.ts',
]);

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    return SOURCE_EXTENSIONS.has(path.extname(fullPath)) ? [fullPath] : [];
  });
}

function toPackageRelativePath(fullPath: string): string {
  return path.relative(EXTENSION_PACKAGE_ROOT, fullPath).split(path.sep).join('/');
}

function collectPatternMatches(pattern: RegExp, shouldScan: (relativePath: string) => boolean): string[] {
  return listSourceFiles(WEBVIEW_SOURCE_ROOT).flatMap((fullPath) => {
    const relativePath = toPackageRelativePath(fullPath);
    if (!shouldScan(relativePath)) {
      return [];
    }

    const source = readFileSync(fullPath, 'utf8');
    const matches = source.match(pattern) ?? [];
    return matches.map(match => `${relativePath}: ${match}`);
  });
}

describe('webview theme token hygiene', () => {
  it('keeps hardcoded hex colors out of UI chrome', () => {
    const matches = collectPatternMatches(
      HEX_COLOR_PATTERN,
      relativePath => !GRAPH_DATA_COLOR_ALLOW_LIST.has(relativePath),
    );

    expect(matches).toEqual([]);
  });

  it('centralizes direct VS Code CSS variable mapping in index.css', () => {
    const matches = collectPatternMatches(
      VSCODE_TOKEN_PATTERN,
      relativePath => relativePath !== 'src/webview/index.css',
    );

    expect(matches).toEqual([]);
  });
});
