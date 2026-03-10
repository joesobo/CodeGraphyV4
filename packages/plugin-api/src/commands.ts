/**
 * @fileoverview Command and context menu types for plugin-contributed actions.
 * @module @codegraphy/plugin-api/commands
 */

/**
 * A command that a plugin can register with CodeGraphy.
 * Commands can be triggered programmatically or bound to context menu items.
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
   * Optional category for grouping in the command palette.
   * @example 'CodeGraphy', 'My Plugin'
   */
  category?: string;

  /**
   * The function to execute when the command is invoked.
   * @param args - Arbitrary arguments passed when the command is called.
   */
  execute(...args: unknown[]): void | Promise<void>;
}

/**
 * A context menu item contributed by a plugin.
 * Appears in the right-click menu on graph nodes or the canvas.
 */
export interface IContextMenuItem {
  /**
   * Unique item identifier.
   * Should be namespaced with the plugin ID.
   */
  id: string;

  /** Display label in the context menu. */
  label: string;

  /**
   * Codicon icon name (without 'codicon-' prefix).
   * @example 'symbol-method', 'trash', 'copy'
   */
  icon?: string;

  /**
   * Menu group for ordering and separators.
   * Items in the same group are kept together; groups are separated by dividers.
   * @example 'navigation', 'modification', 'clipboard'
   */
  group?: string;

  /**
   * Sort order within the group. Lower values appear first.
   * @default 0
   */
  order?: number;

  /**
   * Predicate to determine whether this item should appear.
   * Called with the node IDs of the current selection.
   * Return false to hide the item for this selection.
   *
   * @param selectedNodeIds - IDs of currently selected graph nodes
   */
  when?(selectedNodeIds: string[]): boolean;

  /**
   * Action to execute when the item is clicked.
   *
   * @param selectedNodeIds - IDs of currently selected graph nodes
   */
  execute(selectedNodeIds: string[]): void | Promise<void>;
}
