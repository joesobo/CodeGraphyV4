/**
 * @fileoverview Manages node and edge decorations from plugins.
 * @module core/plugins/decoration/manager
 */

import { Disposable, toDisposable } from '../disposable';
import { mergeNodeDecorations } from './mergeNodeDecorations';
import { mergeEdgeDecorations } from './mergeEdgeDecorations';
import { addDecorationEntry, clearPluginEntries } from './storage';
import type { NodeDecoration, EdgeDecoration, DecorationEntry } from './contracts';

export type { NodeDecoration, EdgeDecoration, TooltipSection, DecorationEntry } from './contracts';

/**
 * Manages decorations applied to nodes and edges by plugins.
 */
export class DecorationManager {
  private readonly _nodeDecorations = new Map<string, DecorationEntry<NodeDecoration>[]>();
  private readonly _edgeDecorations = new Map<string, DecorationEntry<EdgeDecoration>[]>();
  private readonly _changeListeners = new Set<() => void>();

  decorateNode(pluginId: string, nodeId: string, decoration: NodeDecoration): Disposable {
    const entry: DecorationEntry<NodeDecoration> = { pluginId, decoration };
    const remove = addDecorationEntry(this._nodeDecorations, nodeId, entry);
    this._notifyChange();

    return toDisposable(() => {
      remove();
      this._notifyChange();
    });
  }

  decorateEdge(pluginId: string, edgeId: string, decoration: EdgeDecoration): Disposable {
    const entry: DecorationEntry<EdgeDecoration> = { pluginId, decoration };
    const remove = addDecorationEntry(this._edgeDecorations, edgeId, entry);
    this._notifyChange();

    return toDisposable(() => {
      remove();
      this._notifyChange();
    });
  }

  clearDecorations(pluginId: string): void {
    const nodeChanged = clearPluginEntries(this._nodeDecorations, pluginId);
    const edgeChanged = clearPluginEntries(this._edgeDecorations, pluginId);
    if (nodeChanged || edgeChanged) {
      this._notifyChange();
    }
  }

  getMergedNodeDecorations(): Map<string, NodeDecoration> {
    const result = new Map<string, NodeDecoration>();
    for (const [nodeId, entries] of this._nodeDecorations) {
      if (entries.length === 1) {
        result.set(nodeId, entries[0].decoration);
      } else {
        const sorted = [...entries].sort(
          (entryA, entryB) => (entryB.decoration.priority ?? 0) - (entryA.decoration.priority ?? 0)
        );
        result.set(nodeId, mergeNodeDecorations(sorted.map((e) => e.decoration)));
      }
    }
    return result;
  }

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
