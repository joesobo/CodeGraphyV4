import type { IGraphData } from '../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type {
  IGraphControlsSnapshot,
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../shared/graphControls/types';
import {
  CORE_GRAPH_EDGE_TYPES,
  CORE_GRAPH_NODE_TYPES,
} from '../../../shared/graphControls/defaults';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  normalizeHexColor,
} from '../../../shared/fileColors';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';

interface GraphNodeTypeLike {
  id: string;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
}

interface GraphEdgeTypeLike {
  id: string;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
}

interface GraphControlsAnalyzerLike {
  registry?: unknown;
}

interface GraphControlsConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
}

function prettifyIdentifier(value: string): string {
  return value
    .replace(/^codegraphy:/, '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mergeNodeTypes(
  graphData: IGraphData,
  pluginNodeTypes: GraphNodeTypeLike[],
  folderNodeColor: string,
): IGraphNodeTypeDefinition[] {
  const definitions = new Map<string, IGraphNodeTypeDefinition>(
    CORE_GRAPH_NODE_TYPES.map((definition) => [
      definition.id,
      definition.id === 'folder'
        ? { ...definition, defaultColor: folderNodeColor }
        : definition,
    ]),
  );

  for (const definition of pluginNodeTypes) {
    definitions.set(definition.id, definition);
  }

  for (const node of graphData.nodes) {
    const nodeType = node.nodeType ?? 'file';
    if (!definitions.has(nodeType)) {
      definitions.set(nodeType, {
        id: nodeType,
        label: prettifyIdentifier(nodeType),
        defaultColor: node.color || DEFAULT_FOLDER_NODE_COLOR,
        defaultVisible: true,
      });
    }
  }

  return Array.from(definitions.values());
}

function mergeEdgeTypes(
  graphData: IGraphData,
  pluginEdgeTypes: GraphEdgeTypeLike[],
): IGraphEdgeTypeDefinition[] {
  const definitions = new Map<string, IGraphEdgeTypeDefinition>(
    CORE_GRAPH_EDGE_TYPES.map((definition) => [definition.id, definition]),
  );

  for (const definition of pluginEdgeTypes) {
    definitions.set(definition.id, {
      id: definition.id as IGraphEdgeTypeDefinition['id'],
      label: definition.label,
      defaultColor: definition.defaultColor,
      defaultVisible: definition.defaultVisible,
    });
  }

  for (const edge of graphData.edges) {
    if (!definitions.has(edge.kind)) {
      definitions.set(edge.kind, {
        id: edge.kind,
        label: prettifyIdentifier(edge.kind),
        defaultColor: edge.color ?? '#94A3B8',
        defaultVisible: true,
      });
    }
  }

  return Array.from(definitions.values());
}

function resolveVisibilityMap<TDefinition extends { id: string; defaultVisible: boolean }>(
  definitions: TDefinition[],
  configured: Record<string, unknown>,
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};

  for (const definition of definitions) {
    visibility[definition.id] =
      typeof configured[definition.id] === 'boolean'
        ? (configured[definition.id] as boolean)
        : definition.defaultVisible;
  }

  return visibility;
}

function resolveNodeColors(
  definitions: IGraphNodeTypeDefinition[],
  configured: Record<string, unknown>,
): Record<string, string> {
  const colors: Record<string, string> = {};

  for (const definition of definitions) {
    const configuredColor =
      typeof configured[definition.id] === 'string'
        ? (configured[definition.id] as string)
        : undefined;
    colors[definition.id] = normalizeHexColor(configuredColor, definition.defaultColor);
  }

  return colors;
}

function resolveEdgeColors(
  definitions: IGraphEdgeTypeDefinition[],
  configured: Record<string, unknown>,
): Record<string, string> {
  const colors: Record<string, string> = {};

  for (const definition of definitions) {
    const configuredColor =
      typeof configured[definition.id] === 'string'
        ? (configured[definition.id] as string)
        : undefined;
    colors[definition.id] = normalizeHexColor(configuredColor, definition.defaultColor);
  }

  return colors;
}

function readNodeTypes(registry: unknown): GraphNodeTypeLike[] {
  if (!registry || typeof registry !== 'object') {
    return [];
  }

  const candidate = (registry as Record<string, unknown>).listNodeTypes;
  if (typeof candidate !== 'function') {
    return [];
  }

  const definitions: unknown = Reflect.apply(candidate, registry, []);
  if (!Array.isArray(definitions)) {
    return [];
  }

  return definitions.filter((definition): definition is GraphNodeTypeLike => {
    if (!definition || typeof definition !== 'object') {
      return false;
    }

    const record = definition as Record<string, unknown>;
    return (
      typeof record.id === 'string'
      && typeof record.label === 'string'
      && typeof record.defaultColor === 'string'
      && typeof record.defaultVisible === 'boolean'
    );
  });
}

function readEdgeTypes(registry: unknown): GraphEdgeTypeLike[] {
  if (!registry || typeof registry !== 'object') {
    return [];
  }

  const candidate = (registry as Record<string, unknown>).listEdgeTypes;
  if (typeof candidate !== 'function') {
    return [];
  }

  const definitions: unknown = Reflect.apply(candidate, registry, []);
  if (!Array.isArray(definitions)) {
    return [];
  }

  return definitions.filter((definition): definition is GraphEdgeTypeLike => {
    if (!definition || typeof definition !== 'object') {
      return false;
    }

    const record = definition as Record<string, unknown>;
    return (
      typeof record.id === 'string'
      && typeof record.label === 'string'
      && typeof record.defaultColor === 'string'
      && typeof record.defaultVisible === 'boolean'
    );
  });
}

export function captureGraphControlsSnapshot(
  config: GraphControlsConfigurationLike,
  graphData: IGraphData,
  pluginNodeTypes: GraphNodeTypeLike[],
  pluginEdgeTypes: GraphEdgeTypeLike[],
): IGraphControlsSnapshot {
  const folderNodeColor = config.get<string>('folderNodeColor', DEFAULT_FOLDER_NODE_COLOR);
  const nodeTypes = mergeNodeTypes(graphData, pluginNodeTypes, folderNodeColor);
  const edgeTypes = mergeEdgeTypes(graphData, pluginEdgeTypes);

  return {
    nodeTypes,
    edgeTypes,
    nodeColors: resolveNodeColors(
      nodeTypes,
      config.get<Record<string, string>>('nodeColors', {}),
    ),
    nodeVisibility: resolveVisibilityMap(
      nodeTypes,
      config.get<Record<string, boolean>>('nodeVisibility', {}),
    ),
    edgeVisibility: resolveVisibilityMap(
      edgeTypes,
      config.get<Record<string, boolean>>('edgeVisibility', {}),
    ),
    edgeColors: resolveEdgeColors(
      edgeTypes,
      config.get<Record<string, string>>('edgeColors', {}),
    ),
  };
}

export function buildGraphControlsUpdatedMessage(
  snapshot: IGraphControlsSnapshot,
): Extract<ExtensionToWebviewMessage, { type: 'GRAPH_CONTROLS_UPDATED' }> {
  return {
    type: 'GRAPH_CONTROLS_UPDATED',
    payload: snapshot,
  };
}

export function sendGraphControlsUpdated(
  graphData: IGraphData,
  analyzer: GraphControlsAnalyzerLike | undefined,
  sendMessage: (message: ExtensionToWebviewMessage) => void,
  config: GraphControlsConfigurationLike = getCodeGraphyConfiguration(),
): void {
  sendMessage(
    buildGraphControlsUpdatedMessage(
      captureGraphControlsSnapshot(
        config,
        graphData,
        readNodeTypes(analyzer?.registry),
        readEdgeTypes(analyzer?.registry),
      ),
    ),
  );
}
