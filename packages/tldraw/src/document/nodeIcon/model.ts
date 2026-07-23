import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import type { IGraphNode } from '@codegraphy-dev/core';

interface MaterialIconManifest {
  file?: string;
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  iconDefinitions?: Record<string, { iconPath: string }>;
  languageIds?: Record<string, string>;
}

export interface NodeIcon {
  name: string;
  src: string;
}

const COLOR_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g;
const LANGUAGE_BY_EXTENSION = {
  'c': 'c', cc: 'cpp', cjs: 'javascript', cpp: 'cpp', cs: 'csharp',
  cts: 'typescript', cxx: 'cpp', dart: 'dart', ets: 'typescript', go: 'go',
  h: 'c', hh: 'cpp', hpp: 'cpp', htm: 'html', html: 'html', hxx: 'cpp',
  java: 'java', js: 'javascript', jsx: 'javascriptreact', less: 'less', lua: 'lua',
  markdown: 'markdown', md: 'markdown', mjs: 'javascript', mts: 'typescript',
  php: 'php', py: 'python', pyi: 'python', rb: 'ruby', rs: 'rust', rst: 'markdown',
  sass: 'sass', scss: 'sass', sql: 'sql', svelte: 'svelte', swift: 'swift',
  toml: 'toml', ts: 'typescript', tsx: 'typescriptreact', vue: 'vue', xhtml: 'html',
  xml: 'xml', yaml: 'yaml', yml: 'yaml',
} satisfies Record<string, string>;

function loadManifest(): { manifest: MaterialIconManifest; manifestPath: string } {
  const require = createRequire(import.meta.url);
  const packageRoot = dirname(require.resolve('material-icon-theme/package.json'));
  const manifestPath = join(packageRoot, 'dist', 'material-icons.json');
  return {
    manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) as MaterialIconManifest,
    manifestPath,
  };
}

function extensionCandidates(fileName: string): string[] {
  const lowerName = fileName.toLowerCase();
  const candidates = [lowerName];
  for (let index = lowerName.indexOf('.'); index >= 0; index = lowerName.indexOf('.', index + 1)) {
    const extension = lowerName.slice(index + 1);
    if (extension) candidates.push(extension);
  }
  return candidates.sort((left, right) => right.length - left.length);
}

function firstMappedValue(
  candidates: readonly string[],
  values: Readonly<Record<string, string>> | undefined,
): string | undefined {
  if (!values) return undefined;
  for (const candidate of candidates) {
    const value = values[candidate];
    if (value) return value;
  }
  return undefined;
}

function firstLanguageIcon(
  candidates: readonly string[],
  manifest: MaterialIconManifest,
): string | undefined {
  for (const extension of candidates) {
    const languageId = LANGUAGE_BY_EXTENSION[extension as keyof typeof LANGUAGE_BY_EXTENSION];
    const iconName = languageId ? manifest.languageIds?.[languageId] : undefined;
    if (iconName) return iconName;
  }
  return undefined;
}

function resolveIconName(nodeId: string, manifest: MaterialIconManifest): string | undefined {
  const normalizedId = nodeId.replace(/\\/g, '/');
  const fileName = basename(normalizedId).toLowerCase();
  const fileNames = manifest.fileNames ?? {};
  const exactName = fileNames[normalizedId.toLowerCase()] ?? fileNames[fileName];
  if (exactName) return exactName;

  const candidates = extensionCandidates(fileName);
  return firstMappedValue(candidates, manifest.fileExtensions)
    ?? firstLanguageIcon(candidates, manifest)
    ?? manifest.file;
}

function whiteSvgDataUrl(svg: string): string {
  const whiteSvg = svg.replace(COLOR_PATTERN, '#FFFFFF');
  return `data:image/svg+xml;base64,${Buffer.from(whiteSvg, 'utf8').toString('base64')}`;
}

export function createNodeIconMap(nodes: readonly IGraphNode[]): ReadonlyMap<string, NodeIcon> {
  const { manifest, manifestPath } = loadManifest();
  const iconsByName = new Map<string, NodeIcon>();
  const iconsByNodeId = new Map<string, NodeIcon>();
  for (const node of nodes) {
    const iconName = resolveIconName(node.id, manifest);
    const iconPath = iconName ? manifest.iconDefinitions?.[iconName]?.iconPath : undefined;
    if (!iconName || !iconPath) continue;
    let icon = iconsByName.get(iconName);
    if (!icon) {
      const svg = readFileSync(resolve(dirname(manifestPath), iconPath), 'utf8');
      icon = { name: iconName, src: whiteSvgDataUrl(svg) };
      iconsByName.set(iconName, icon);
    }
    iconsByNodeId.set(node.id, icon);
  }
  return iconsByNodeId;
}
