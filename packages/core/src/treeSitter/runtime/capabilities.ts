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
  'c': ['import'],
  cpp: ['import', 'call', 'contains', 'inherit', 'overrides'],
  csharp: ['import', 'reference', 'inherit'],
  dart: ['import', 'inherit'],
  go: ['import', 'call'],
  haskell: ['import'],
  java: ['import', 'call', 'inherit'],
  javascript: ['import', 'call', 'inherit'],
  kotlin: ['import', 'inherit'],
  lua: ['import'],
  objectiveC: ['import', 'inherit'],
  pascal: ['import', 'inherit'],
  php: ['import', 'inherit'],
  python: ['import', 'call', 'inherit'],
  ruby: ['import', 'inherit'],
  rust: ['import', 'call'],
  scala: ['import', 'inherit'],
  swift: ['import', 'inherit'],
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
