import {
  createElement,
  useEffect,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { useEditor, useValue, type TLShape } from 'tldraw';

interface NodeInspector {
  entityId: string;
  fileName: string;
  fileType: string;
  incoming: readonly NodeRelationship[];
  outgoing: readonly NodeRelationship[];
}

interface NodeRelationship {
  entityId: string;
  fileName: string;
  kind: string;
}

const inspectorStyle = {
  background: 'var(--tl-color-background)',
  border: '1px solid var(--tl-color-low-border)',
  borderRadius: 8,
  bottom: 96,
  boxShadow: 'var(--tl-shadow-2)',
  color: 'var(--tl-color-text-1)',
  fontFamily: 'Inter, system-ui, sans-serif',
  overflowY: 'auto',
  padding: 16,
  pointerEvents: 'auto',
  position: 'absolute',
  right: 12,
  top: 432,
  width: 280,
  zIndex: 300,
} satisfies CSSProperties;

const sectionLabelStyle = {
  color: 'var(--tl-color-text-3)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
} satisfies CSSProperties;

function metadataString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function nodeEntityId(shape: TLShape | undefined): string | undefined {
  if (shape?.meta.codegraphyKind === 'node') {
    return metadataString(shape.meta.codegraphyEntityId);
  }
  if (shape?.meta.codegraphyKind === 'icon' || shape?.meta.codegraphyKind === 'label') {
    return metadataString(shape.meta.codegraphyNodeId);
  }
  return undefined;
}

function resolveNode(shape: TLShape, shapes: readonly TLShape[]): TLShape | undefined {
  const entityId = nodeEntityId(shape);
  if (!entityId) return undefined;
  return shapes.find(candidate => (
    candidate.meta.codegraphyKind === 'node'
    && candidate.meta.codegraphyEntityId === entityId
  ));
}

function fileName(entityId: string): string {
  return entityId.split('/').at(-1) ?? entityId;
}

function fileType(shape: TLShape, entityId: string): string {
  const name = fileName(entityId);
  const extensionIndex = name.lastIndexOf('.');
  if (extensionIndex >= 0 && extensionIndex < name.length - 1) {
    return name.slice(extensionIndex + 1).toUpperCase();
  }
  return metadataString(shape.meta.codegraphyNodeType)?.toUpperCase() ?? 'NODE';
}

function relationship(
  entityId: string,
  edge: TLShape,
): NodeRelationship {
  return {
    entityId,
    fileName: fileName(entityId),
    kind: metadataString(edge.meta.codegraphyRelationshipKind) ?? 'relationship',
  };
}

function inspectNode(node: TLShape, shapes: readonly TLShape[]): NodeInspector {
  const entityId = metadataString(node.meta.codegraphyEntityId) ?? '';
  const incoming: NodeRelationship[] = [];
  const outgoing: NodeRelationship[] = [];

  for (const shape of shapes) {
    if (shape.meta.codegraphyKind !== 'edge') continue;
    const from = metadataString(shape.meta.codegraphyFrom);
    const to = metadataString(shape.meta.codegraphyTo);
    if (to === entityId && from) incoming.push(relationship(from, shape));
    if (from === entityId && to) outgoing.push(relationship(to, shape));
  }

  return {
    entityId,
    fileName: fileName(entityId),
    fileType: fileType(node, entityId),
    incoming,
    outgoing,
  };
}

function relationshipRow(
  relationshipValue: NodeRelationship,
  direction: 'incoming' | 'outgoing',
  index: number,
): ReactElement {
  return createElement('li', {
    key: `${direction}:${relationshipValue.entityId}:${relationshipValue.kind}:${index}`,
    style: {
      display: 'grid',
      gap: 2,
      gridTemplateColumns: '18px minmax(0, 1fr)',
      marginTop: 9,
    },
  },
  createElement('span', {
    'aria-hidden': true,
    style: { color: 'var(--tl-color-selected)', fontWeight: 700 },
  }, direction === 'incoming' ? '←' : '→'),
  createElement('span', null,
    createElement('span', {
      style: {
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      title: relationshipValue.entityId,
    }, relationshipValue.fileName),
    createElement('span', {
      style: {
        color: 'var(--tl-color-text-3)',
        display: 'block',
        fontSize: 11,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      title: relationshipValue.entityId,
    }, `${relationshipValue.kind} · ${relationshipValue.entityId}`),
  ));
}

function NodeInspectorContent({ inspector }: { inspector: NodeInspector }): ReactElement {
  const total = inspector.incoming.length + inspector.outgoing.length;
  return createElement('section', {
    'aria-label': 'CodeGraphy node inspector',
    'data-codegraphy-node-inspector': true,
    style: inspectorStyle,
  },
  createElement('div', { style: sectionLabelStyle }, 'Node'),
  createElement('h2', {
    style: {
      fontFamily: '"Shantell Sans", "Comic Sans MS", cursive',
      fontSize: 20,
      lineHeight: 1.2,
      margin: '8px 0 3px',
      overflowWrap: 'anywhere',
    },
  }, inspector.fileName),
  createElement('div', {
    style: {
      color: 'var(--tl-color-text-3)',
      fontFamily: 'ui-monospace, monospace',
      fontSize: 11,
      overflowWrap: 'anywhere',
    },
  }, inspector.entityId),
  createElement('div', {
    style: {
      borderBottom: '1px solid var(--tl-color-low-border)',
      borderTop: '1px solid var(--tl-color-low-border)',
      display: 'grid',
      gap: 12,
      gridTemplateColumns: '1fr 1fr',
      margin: '14px 0',
      padding: '12px 0',
    },
  },
  createElement('div', null,
    createElement('div', { style: sectionLabelStyle }, 'Type'),
    createElement('div', { style: { fontSize: 13, marginTop: 3 } }, inspector.fileType),
  ),
  createElement('div', null,
    createElement('div', { style: sectionLabelStyle }, 'Connections'),
    createElement('div', { style: { fontSize: 13, marginTop: 3 } }, `${total} total`),
  )),
  createElement('div', {
    style: { display: 'flex', fontSize: 12, gap: 12 },
  },
  createElement('span', null, `${inspector.incoming.length} incoming`),
  createElement('span', null, `${inspector.outgoing.length} outgoing`)),
  total > 0
    ? createElement('div', { style: { marginTop: 16 } },
      createElement('div', { style: sectionLabelStyle }, 'Relationships'),
      createElement('ul', {
        style: { listStyle: 'none', margin: 0, padding: 0 },
      },
      ...inspector.incoming.map((item, index) => relationshipRow(item, 'incoming', index)),
      ...inspector.outgoing.map((item, index) => relationshipRow(item, 'outgoing', index))))
    : null);
}

export function NodeInspectorPanel(): ReactElement | null {
  const editor = useEditor();
  const [inspector, setInspector] = useState<NodeInspector | null>(null);
  const editingShape = useValue(
    'CodeGraphy editing node',
    () => editor.getEditingShape(),
    [editor],
  );
  const selectedShape = useValue(
    'CodeGraphy selected node',
    () => editor.getOnlySelectedShape(),
    [editor],
  );

  useEffect(() => {
    if (!editingShape) return;
    const shapes = editor.getCurrentPageShapes();
    const node = resolveNode(editingShape, shapes);
    if (!node) return;
    setInspector(inspectNode(node, shapes));
    editor.setEditingShape(null);
  }, [editingShape, editor]);

  useEffect(() => {
    setInspector(current => (
      current && nodeEntityId(selectedShape ?? undefined) !== current.entityId
        ? null
        : current
    ));
  }, [selectedShape]);

  return inspector ? createElement(NodeInspectorContent, { inspector }) : null;
}
