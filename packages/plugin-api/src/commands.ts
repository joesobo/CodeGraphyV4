/**
 * @fileoverview Command and context menu types for plugin-contributed actions.
 * @module @codegraphy-vscode/plugin-api/commands
 */

import type { IGraphNode, IGraphEdge } from './graph';

/**
 * A command that a plugin can register with CodeGraphy.
 * Commands can be triggered programmatically or from the command palette.
 */
export interface ICommand {
  /**
   * Unique command identifier.
   * Should be namespaced with the plugin ID (e.g., 'myplugin.runAnalysis').
   */
  id: string;

  /** Human-readable title for display in the command palette. */
  title: string;

  /**
   * The function to execute when the command is invoked.
   */
  action(): void | Promise<void>;
}

/**
 * A context menu item contributed by a plugin.
 * Appears in the right-click menu on graph nodes or edges.
 */
export interface IContextMenuItem {
  /** Display label in the context menu. */
  label: string;

  /**
   * Where this item should appear.
   */
  when: 'node' | 'edge' | 'both';

  /**
   * Action to execute when the item is clicked.
   * Receives the right-click target.
   */
  action(target: IGraphNode | IGraphEdge): void | Promise<void>;

  /** Optional codicon icon name (without `codicon-` prefix). */
  icon?: string;

  /** Optional group key for menu ordering/separators. */
  group?: string;
}
