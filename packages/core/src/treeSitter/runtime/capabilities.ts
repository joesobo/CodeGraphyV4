import type {
  GraphEdgeKind,
  IPluginGraphScopeCapabilities,
  NodeType,
} from '@codegraphy-dev/plugin-api';
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
  'c': ['import', 'call'],
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

const TREE_SITTER_NODE_TYPE_CAPABILITIES_BY_LANGUAGE = {
  'c': ['symbol:function', 'symbol:struct', 'symbol:enum', 'symbol:constant'],
  cpp: ['symbol:function', 'symbol:class', 'symbol:struct', 'symbol:enum', 'symbol:type', 'symbol:constant'],
  csharp: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:enum', 'symbol:constant'],
  dart: ['symbol:function', 'symbol:class', 'symbol:enum', 'symbol:constant'],
  go: ['symbol:function', 'symbol:struct', 'symbol:interface', 'symbol:constant'],
  haskell: ['symbol:function', 'symbol:type', 'symbol:constant'],
  java: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:enum', 'symbol:constant'],
  javascript: ['symbol:function', 'symbol:class', 'symbol:constant'],
  kotlin: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:enum', 'symbol:constant'],
  lua: ['symbol:function', 'symbol:constant'],
  objectiveC: ['symbol:function', 'symbol:class', 'symbol:constant'],
  pascal: ['symbol:function', 'symbol:type', 'symbol:constant'],
  php: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:constant'],
  python: ['symbol:function', 'symbol:class', 'symbol:constant'],
  ruby: ['symbol:function', 'symbol:class', 'symbol:constant'],
  rust: ['symbol:function', 'symbol:struct', 'symbol:enum', 'symbol:type', 'symbol:constant'],
  scala: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:constant'],
  swift: ['symbol:function', 'symbol:class', 'symbol:struct', 'symbol:enum', 'symbol:constant'],
  tsx: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:constant'],
  typescript: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:constant'],
} as const satisfies Record<TreeSitterCapabilityLanguageKind, readonly NodeType[]>;

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

export function listTreeSitterGraphScopeCapabilities(
  filePaths: readonly string[] = [],
): Required<IPluginGraphScopeCapabilities> {
  return {
    nodeTypes: listTreeSitterNodeTypeCapabilities(filePaths),
    edgeTypes: listTreeSitterEdgeTypeCapabilities(filePaths),
  };
}

export function listTreeSitterNodeTypeCapabilities(
  filePaths: readonly string[] = [],
): NodeType[] {
  if (filePaths.length === 0) {
    return [];
  }

  const capabilities = new Set<NodeType>();

  for (const filePath of filePaths) {
    for (const capability of readTreeSitterLanguageNodeTypeCapabilities(filePath)) {
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

function readTreeSitterLanguageNodeTypeCapabilities(filePath: string): readonly NodeType[] {
  const languageKind = getTreeSitterCapabilityLanguageKind(filePath);
  return languageKind
    ? TREE_SITTER_NODE_TYPE_CAPABILITIES_BY_LANGUAGE[languageKind]
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
