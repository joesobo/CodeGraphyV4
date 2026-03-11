/**
 * @fileoverview Undo/Redo manager for CodeGraphy.
 * Implements Command pattern for reversible actions.
 * @module extension/UndoManager
 */

/**
 * Interface for undoable actions.
 * Each action knows how to execute and reverse itself.
 */
export interface IUndoableAction {
  /** Human-readable description of the action */
  readonly description: string;
  /** Execute the action (or re-execute for redo) */
  execute(): Promise<void>;
  /** Reverse the action */
  undo(): Promise<void>;
}

/**
 * Manages undo/redo history for CodeGraphy.
 * Uses a simple stack-based approach with configurable max history.
 */
export class UndoManager {
  private _undoStack: IUndoableAction[] = [];
  private _redoStack: IUndoableAction[] = [];
  private readonly _maxHistory: number;

  /**
   * Creates a new UndoManager.
   * @param maxHistory - Maximum number of actions to keep in history (default 50)
   */
  constructor(maxHistory = 50) {
    this._maxHistory = maxHistory;
  }

  /**
   * Executes an action and adds it to the undo stack.
   * Clears the redo stack since we're starting a new branch.
   */
  async execute(action: IUndoableAction): Promise<void> {
    await action.execute();
    this._undoStack.push(action);
    this._redoStack = []; // Clear redo stack on new action

    // Trim history if needed
    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift();
    }
  }

  /**
   * Undoes the last action.
   * @returns Description of the undone action, or undefined if nothing to undo
   */
  async undo(): Promise<string | undefined> {
    const action = this._undoStack.pop();
    if (!action) return undefined;

    await action.undo();
    this._redoStack.push(action);
    return action.description;
  }

  /**
   * Redoes the last undone action.
   * @returns Description of the redone action, or undefined if nothing to redo
   */
  async redo(): Promise<string | undefined> {
    const action = this._redoStack.pop();
    if (!action) return undefined;

    await action.execute();
    this._undoStack.push(action);
    return action.description;
  }

  /**
   * Checks if undo is available.
   */
  canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  /**
   * Checks if redo is available.
   */
  canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /**
   * Gets the description of the next undo action.
   */
  getUndoDescription(): string | undefined {
    return this._undoStack[this._undoStack.length - 1]?.description;
  }

  /**
   * Gets the description of the next redo action.
   */
  getRedoDescription(): string | undefined {
    return this._redoStack[this._redoStack.length - 1]?.description;
  }

  /**
   * Clears all history.
   */
  clear(): void {
    this._undoStack = [];
    this._redoStack = [];
  }
}

/**
 * Singleton instance for the extension.
 */
let _instance: UndoManager | undefined;

/**
 * Gets the global UndoManager instance.
 */
export function getUndoManager(): UndoManager {
  if (!_instance) {
    _instance = new UndoManager();
  }
  return _instance;
}

/**
 * Resets the global UndoManager instance (for testing).
 */
export function resetUndoManager(): void {
  _instance = undefined;
}
