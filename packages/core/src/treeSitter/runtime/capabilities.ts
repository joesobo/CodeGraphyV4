import type {
  GraphEdgeKind,
  IPluginGraphScopeCapabilities,
  NodeType,
} from '@codegraphy-dev/plugin-api';
import { TREE_SITTER_RUNTIME_BINDINGS } from './languages/bindings';
import { getFileExtension, type TreeSitterLanguageKind } from './languages/catalog';

type TreeSitterCapabilityLanguageKind = TreeSitterLanguageKind | 'pascal';

interface TreeSitterCapabilityContext {
  hasCSource: boolean;
  hasObjectiveCSource: boolean;
}

const DEFAULT_TREE_SITTER_EDGE_TYPE_CAPABILITIES = [
  'import',
  'reference',
  'call',
  'type-import',
  'inherit',
] as const satisfies readonly GraphEdgeKind[];

const TREE_SITTER_EDGE_TYPE_CAPABILITIES_BY_LANGUAGE = {
  'c': ['include', 'call', 'contains'],
  cpp: ['include', 'call', 'contains', 'inherit', 'overrides'],
  csharp: ['import', 'reference', 'call', 'inherit'],
  dart: ['import', 'reference', 'call', 'inherit'],
  go: ['import', 'reference', 'call'],
  haskell: ['import', 'reference', 'call'],
  java: ['import', 'reference', 'call', 'inherit'],
  javascript: ['import', 'reference', 'call', 'inherit'],
  kotlin: ['import', 'reference', 'call', 'inherit'],
  lua: ['import', 'reference', 'call'],
  objectiveC: ['import', 'reference', 'call', 'inherit'],
  pascal: ['import', 'reference', 'call', 'inherit'],
  php: ['import', 'reference', 'call', 'inherit'],
  python: ['import', 'reference', 'call', 'inherit'],
  ruby: ['import', 'reference', 'call', 'inherit'],
  rust: ['import', 'reference', 'call'],
  scala: ['import', 'reference', 'call', 'inherit'],
  swift: ['import', 'reference', 'call', 'inherit'],
  tsx: ['import', 'type-import', 'call', 'inherit', 'contains'],
  typescript: ['import', 'type-import', 'call', 'inherit', 'contains'],
} as const satisfies Record<TreeSitterCapabilityLanguageKind, readonly GraphEdgeKind[]>;

const TREE_SITTER_NODE_TYPE_CAPABILITIES_BY_LANGUAGE = {
  'c': [
    'symbol:function',
    'symbol:prototype',
    'symbol:struct',
    'symbol:union',
    'symbol:enum',
    'symbol:typedef',
    'symbol:global',
  ],
  cpp: [
    'symbol:namespace',
    'symbol:class',
    'symbol:enum',
    'symbol:callable',
    'symbol:method',
    'symbol:alias',
    'symbol:template',
    'symbol:global',
    'symbol:constant',
    'symbol:field',
    'symbol:parameter',
    'symbol:local',
  ],
  csharp: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:struct', 'symbol:enum'],
  dart: ['symbol:function', 'symbol:class', 'symbol:enum'],
  go: ['symbol:function', 'symbol:struct', 'symbol:interface', 'symbol:type'],
  haskell: ['symbol:function', 'symbol:type', 'symbol:class'],
  java: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:enum'],
  javascript: ['symbol:function', 'symbol:class', 'symbol:constant'],
  kotlin: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:enum'],
  lua: ['symbol:function'],
  objectiveC: ['symbol:function', 'symbol:class'],
  pascal: ['symbol:function', 'symbol:class', 'symbol:struct', 'symbol:interface'],
  php: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:enum'],
  python: ['symbol:function', 'symbol:class'],
  ruby: ['symbol:function', 'symbol:class'],
  rust: ['symbol:function', 'symbol:struct', 'symbol:enum'],
  scala: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:enum'],
  swift: ['symbol:function', 'symbol:class', 'symbol:struct', 'symbol:enum'],
  tsx: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:enum', 'symbol:constant'],
  typescript: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type', 'symbol:enum', 'symbol:constant'],
} as const satisfies Record<TreeSitterCapabilityLanguageKind, readonly NodeType[]>;

export function listTreeSitterEdgeTypeCapabilities(
  filePaths?: readonly string[],
): GraphEdgeKind[] {
  if (!filePaths || filePaths.length === 0) {
    return [...DEFAULT_TREE_SITTER_EDGE_TYPE_CAPABILITIES];
  }

  const capabilities = new Set<GraphEdgeKind>();
  const context = createTreeSitterCapabilityContext(filePaths);

  for (const filePath of filePaths) {
    for (const capability of readTreeSitterLanguageCapabilities(filePath, context)) {
      capabilities.add(capability);
    }
  }

  return [...capabilities];
}

export function listTreeSitterGraphScopeCapabilities(
  filePaths?: readonly string[],
): Required<IPluginGraphScopeCapabilities> {
  return {
    nodeTypes: listTreeSitterNodeTypeCapabilities(filePaths),
    edgeTypes: listTreeSitterEdgeTypeCapabilities(filePaths),
  };
}

export function listTreeSitterNodeTypeCapabilities(
  filePaths?: readonly string[],
): NodeType[] {
  if (!filePaths || filePaths.length === 0) {
    return [];
  }

  const capabilities = new Set<NodeType>();
  const context = createTreeSitterCapabilityContext(filePaths);

  for (const filePath of filePaths) {
    for (const capability of readTreeSitterLanguageNodeTypeCapabilities(filePath, context)) {
      capabilities.add(capability);
    }
  }

  return [...capabilities];
}

function createTreeSitterCapabilityContext(filePaths: readonly string[]): TreeSitterCapabilityContext {
  const extensions = new Set(filePaths.map(getFileExtension));
  return {
    hasCSource: extensions.has('.c'),
    hasObjectiveCSource: extensions.has('.m') || extensions.has('.mm'),
  };
}

function readTreeSitterLanguageCapabilities(
  filePath: string,
  context: TreeSitterCapabilityContext,
): readonly GraphEdgeKind[] {
  const extension = getFileExtension(filePath);
  if (extension === '.h' && context.hasObjectiveCSource && !context.hasCSource) {
    return TREE_SITTER_EDGE_TYPE_CAPABILITIES_BY_LANGUAGE.objectiveC;
  }

  const languageKind = getTreeSitterCapabilityLanguageKind(filePath);
  return languageKind
    ? TREE_SITTER_EDGE_TYPE_CAPABILITIES_BY_LANGUAGE[languageKind]
    : [];
}

function readTreeSitterLanguageNodeTypeCapabilities(
  filePath: string,
  context: TreeSitterCapabilityContext,
): readonly NodeType[] {
  const extension = getFileExtension(filePath);
  if (extension === '.h' && context.hasObjectiveCSource && !context.hasCSource) {
    return TREE_SITTER_NODE_TYPE_CAPABILITIES_BY_LANGUAGE.objectiveC;
  }

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
