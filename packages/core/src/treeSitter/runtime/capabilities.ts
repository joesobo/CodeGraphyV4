import type { GraphEdgeKind } from '@codegraphy-dev/plugin-api';
import { TREE_SITTER_RUNTIME_BINDINGS } from './languages/bindings';
import { getFileExtension, type TreeSitterLanguageKind } from './languages/catalog';

type TreeSitterCapabilityLanguageKind = TreeSitterLanguageKind | 'pascal';

const DEFAULT_TREE_SITTER_EDGE_TYPE_CAPABILITIES = [
  'import',
  'reference',
  'call',
  'type-import',
  'inherit',
] as const satisfies readonly GraphEdgeKind[];

const TREE_SITTER_EDGE_TYPE_CAPABILITIES_BY_LANGUAGE = {
  'c': ['include', 'call', 'contains'],
  cpp: ['import', 'call', 'contains', 'inherit', 'overrides'],
  csharp: ['import', 'reference', 'call', 'inherit'],
  dart: ['import', 'call', 'inherit'],
  go: ['import', 'call'],
  haskell: ['import', 'call'],
  java: ['import', 'call', 'inherit'],
  javascript: ['import', 'call', 'inherit'],
  kotlin: ['import', 'call', 'inherit'],
  lua: ['import', 'call'],
  objectiveC: ['import', 'call', 'inherit'],
  pascal: ['import', 'call', 'inherit'],
  php: ['import', 'reference', 'call', 'inherit'],
  python: ['import', 'call', 'inherit'],
  ruby: ['import', 'call', 'inherit'],
  rust: ['import', 'call'],
  scala: ['import', 'call', 'inherit'],
  swift: ['import', 'reference', 'call', 'inherit'],
  tsx: ['import', 'type-import', 'call', 'inherit'],
  typescript: ['import', 'type-import', 'call', 'inherit'],
} as const satisfies Record<TreeSitterCapabilityLanguageKind, readonly GraphEdgeKind[]>;

export function listTreeSitterEdgeTypeCapabilities(
  filePaths: readonly string[] = [],
): GraphEdgeKind[] {
  if (filePaths.length === 0) {
    return [...DEFAULT_TREE_SITTER_EDGE_TYPE_CAPABILITIES];
  }

  const capabilities = new Set<GraphEdgeKind>();

  for (const filePath of filePaths) {
    for (const capability of readTreeSitterLanguageCapabilities(filePath)) {
      capabilities.add(capability);
    }
  }

  return [...capabilities];
}

function readTreeSitterLanguageCapabilities(filePath: string): readonly GraphEdgeKind[] {
  const languageKind = getTreeSitterCapabilityLanguageKind(filePath);
  return languageKind
    ? TREE_SITTER_EDGE_TYPE_CAPABILITIES_BY_LANGUAGE[languageKind]
    : [];
}

function getTreeSitterCapabilityLanguageKind(
  filePath: string,
): TreeSitterCapabilityLanguageKind | undefined {
  const extension = getFileExtension(filePath);
  if (extension === '.pas') {
    return 'pascal';
  }

  return TREE_SITTER_RUNTIME_BINDINGS[
    extension as keyof typeof TREE_SITTER_RUNTIME_BINDINGS
  ]?.languageKind;
}
