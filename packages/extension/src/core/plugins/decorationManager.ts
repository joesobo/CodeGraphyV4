/**
 * @fileoverview Manages node and edge decorations from plugins.
 * Handles multi-plugin merge logic with priority-based conflict resolution.
 * @module core/plugins/DecorationManager
 */

import { Disposable, toDisposable } from './disposable';
import { mergeNodeDecorations, mergeEdgeDecorations } from './decorationMerge';

/**
 * Structured decoration properties for graph nodes.
 * All fields are optional. Higher `priority` wins per-property.
 */
export interface NodeDecoration {
  badge?: {
    text: string;
    color?: string;
    bgColor?: string;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    tooltip?: string;
  };
  border?: {
    color: string;
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  tooltip?: {
    sections: TooltipSection[];
  };
  label?: {
    text?: string;
    sublabel?: string;
    color?: string;
  };
  size?: {
    scale?: number;
  };
  opacity?: number;
  color?: string;
  icon?: string;
  group?: string;
  priority?: number;
}

/**
 * Structured decoration properties for graph edges.
 */
export interface EdgeDecoration {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  label?: { text: string; color?: string };
  particles?: { count?: number; color?: string; speed?: number };
  opacity?: number;
  curvature?: number;
  priority?: number;
}

/**
 * A section in a tooltip provided by a plugin.
 */
export interface TooltipSection {
  title: string;
  content: string;
}

/** Internal storage for a single decoration entry */
interface DecorationEntry<T> {
  pluginId: string;
  decoration: T;
}

/**
 * Manages decorations applied to nodes and edges by plugins.
 * Supports multi-plugin decoration merging with priority-based conflict resolution.
 */
export class DecorationManager {
  /** Node decorations: nodeId → list of plugin entries */
  private readonly _nodeDecorations = new Map<string, DecorationEntry<NodeDecoration>[]>();

  /** Edge decorations: edgeId → list of plugin entries */
  private readonly _edgeDecorations = new Map<string, DecorationEntry<EdgeDecoration>[]>();

  /** Change listeners */
  private readonly _changeListeners = new Set<() => void>();

  /**
   * Add a decoration to a node.
   * @returns Disposable that removes this specific decoration
   */
  decorateNode(pluginId: string, nodeId: string, decoration: NodeDecoration): Disposable {
    const entry: DecorationEntry<NodeDecoration> = { pluginId, decoration };

    let entries = this._nodeDecorations.get(nodeId);
    if (!entries) {
      entries = [];
      this._nodeDecorations.set(nodeId, entries);
    }
    entries.push(entry);
    this._notifyChange();

    return toDisposable(() => {
      const list = this._nodeDecorations.get(nodeId);
      if (list) {
        const idx = list.indexOf(entry);
        if (idx !== -1) {
          list.splice(idx, 1);
          if (list.length === 0) {
            this._nodeDecorations.delete(nodeId);
          }
          this._notifyChange();
        }
      }
    });
  }

  /**
   * Add a decoration to an edge.
   * @returns Disposable that removes this specific decoration
   */
  decorateEdge(pluginId: string, edgeId: string, decoration: EdgeDecoration): Disposable {
    const entry: DecorationEntry<EdgeDecoration> = { pluginId, decoration };

    let entries = this._edgeDecorations.get(edgeId);
    if (!entries) {
      entries = [];
      this._edgeDecorations.set(edgeId, entries);
    }
    entries.push(entry);
    this._notifyChange();

    return toDisposable(() => {
      const list = this._edgeDecorations.get(edgeId);
      if (list) {
        const idx = list.indexOf(entry);
        if (idx !== -1) {
          list.splice(idx, 1);
          if (list.length === 0) {
            this._edgeDecorations.delete(edgeId);
          }
          this._notifyChange();
        }
      }
    });
  }

  /**
   * Remove all decorations set by a specific plugin.
   */
  clearDecorations(pluginId: string): void {
    let changed = false;

    for (const [nodeId, entries] of this._nodeDecorations) {
      const filtered = entries.filter((e) => e.pluginId !== pluginId);
      if (filtered.length !== entries.length) {
        changed = true;
        if (filtered.length === 0) {
          this._nodeDecorations.delete(nodeId);
        } else {
          this._nodeDecorations.set(nodeId, filtered);
        }
      }
    }

    for (const [edgeId, entries] of this._edgeDecorations) {
      const filtered = entries.filter((e) => e.pluginId !== pluginId);
      if (filtered.length !== entries.length) {
        changed = true;
        if (filtered.length === 0) {
          this._edgeDecorations.delete(edgeId);
        } else {
          this._edgeDecorations.set(edgeId, filtered);
        }
      }
    }

    if (changed) {
      this._notifyChange();
    }
  }

  /**
   * Get merged node decorations for all nodes.
   * When multiple plugins decorate the same node, properties are merged
   * with higher priority winning per-property.
   */
  getMergedNodeDecorations(): Map<string, NodeDecoration> {
    const result = new Map<string, NodeDecoration>();

    for (const [nodeId, entries] of this._nodeDecorations) {
      if (entries.length === 1) {
        result.set(nodeId, entries[0].decoration);
      } else {
        // Sort by priority descending (higher priority first)
        const sorted = [...entries].sort(
          (entryA, entryB) => (entryB.decoration.priority ?? 0) - (entryA.decoration.priority ?? 0)
        );
        result.set(nodeId, mergeNodeDecorations(sorted.map((e) => e.decoration)));
      }
    }

    return result;
  }

  /**
   * Get merged edge decorations for all edges.
   */
  getMergedEdgeDecorations(): Map<string, EdgeDecoration> {
    const result = new Map<string, EdgeDecoration>();

    for (const [edgeId, entries] of this._edgeDecorations) {
      if (entries.length === 1) {
        result.set(edgeId, entries[0].decoration);
      } else {
        const sorted = [...entries].sort(
          (entryA, entryB) => (entryB.decoration.priority ?? 0) - (entryA.decoration.priority ?? 0)
        );
        result.set(edgeId, mergeEdgeDecorations(sorted.map((e) => e.decoration)));
      }
    }

    return result;
  }

  /**
   * Listen for any decoration changes.
   * @returns Disposable to stop listening
   */
  onDecorationsChanged(callback: () => void): Disposable {
    this._changeListeners.add(callback);
    return toDisposable(() => {
      this._changeListeners.delete(callback);
    });
  }

  private _notifyChange(): void {
    for (const listener of this._changeListeners) {
      try {
        listener();
      } catch (e) {
        console.error('[CodeGraphy] Error in decoration change listener:', e);
      }
    }
  }
}
