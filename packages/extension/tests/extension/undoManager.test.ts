/**
 * @fileoverview Tests for UndoManager.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UndoManager, IUndoableAction } from '../../src/extension/UndoManager';

/**
 * Simple test action that tracks execution state.
 */
class TestAction implements IUndoableAction {
  readonly description: string;
  executed = false;
  undone = false;
  
  constructor(description: string) {
    this.description = description;
  }

  async execute(): Promise<void> {
    this.executed = true;
    this.undone = false;
  }

  async undo(): Promise<void> {
    this.undone = true;
    this.executed = false;
  }
}

describe('UndoManager', () => {
  let manager: UndoManager;

  beforeEach(() => {
    manager = new UndoManager();
  });

  describe('execute', () => {
    it('should execute an action', async () => {
      const action = new TestAction('Test');
      await manager.execute(action);
      expect(action.executed).toBe(true);
    });

    it('should add action to undo stack', async () => {
      const action = new TestAction('Test');
      await manager.execute(action);
      expect(manager.canUndo()).toBe(true);
    });

    it('should clear redo stack on new action', async () => {
      const action1 = new TestAction('Action 1');
      const action2 = new TestAction('Action 2');
      
      await manager.execute(action1);
      await manager.undo();
      expect(manager.canRedo()).toBe(true);
      
      await manager.execute(action2);
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('undo', () => {
    it('should undo the last action', async () => {
      const action = new TestAction('Test');
      await manager.execute(action);
      
      const description = await manager.undo();
      
      expect(action.undone).toBe(true);
      expect(description).toBe('Test');
    });

    it('should return undefined when nothing to undo', async () => {
      const description = await manager.undo();
      expect(description).toBeUndefined();
    });

    it('should add undone action to redo stack', async () => {
      const action = new TestAction('Test');
      await manager.execute(action);
      
      expect(manager.canRedo()).toBe(false);
      await manager.undo();
      expect(manager.canRedo()).toBe(true);
    });

    it('should undo actions in reverse order', async () => {
      const action1 = new TestAction('First');
      const action2 = new TestAction('Second');
      
      await manager.execute(action1);
      await manager.execute(action2);
      
      const desc1 = await manager.undo();
      expect(desc1).toBe('Second');
      
      const desc2 = await manager.undo();
      expect(desc2).toBe('First');
    });
  });

  describe('redo', () => {
    it('should redo the last undone action', async () => {
      const action = new TestAction('Test');
      await manager.execute(action);
      await manager.undo();
      
      const description = await manager.redo();
      
      expect(action.executed).toBe(true);
      expect(description).toBe('Test');
    });

    it('should return undefined when nothing to redo', async () => {
      const description = await manager.redo();
      expect(description).toBeUndefined();
    });

    it('should add redone action back to undo stack', async () => {
      const action = new TestAction('Test');
      await manager.execute(action);
      await manager.undo();
      
      expect(manager.canUndo()).toBe(false);
      await manager.redo();
      expect(manager.canUndo()).toBe(true);
    });
  });

  describe('canUndo/canRedo', () => {
    it('should return false when stacks are empty', () => {
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });

    it('should return correct state after operations', async () => {
      const action = new TestAction('Test');
      
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
      
      await manager.execute(action);
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
      
      await manager.undo();
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(true);
      
      await manager.redo();
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('getUndoDescription/getRedoDescription', () => {
    it('should return descriptions of pending actions', async () => {
      const action = new TestAction('My Action');
      await manager.execute(action);
      
      expect(manager.getUndoDescription()).toBe('My Action');
      expect(manager.getRedoDescription()).toBeUndefined();
      
      await manager.undo();
      expect(manager.getUndoDescription()).toBeUndefined();
      expect(manager.getRedoDescription()).toBe('My Action');
    });
  });

  describe('clear', () => {
    it('should clear all history', async () => {
      const action1 = new TestAction('Action 1');
      const action2 = new TestAction('Action 2');
      
      await manager.execute(action1);
      await manager.execute(action2);
      await manager.undo();
      
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(true);
      
      manager.clear();
      
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('maxHistory', () => {
    it('should trim history when exceeding max', async () => {
      const manager = new UndoManager(3);
      
      await manager.execute(new TestAction('1'));
      await manager.execute(new TestAction('2'));
      await manager.execute(new TestAction('3'));
      await manager.execute(new TestAction('4'));
      
      // Should have trimmed '1', stack should be ['2', '3', '4']
      expect(await manager.undo()).toBe('4');
      expect(await manager.undo()).toBe('3');
      expect(await manager.undo()).toBe('2');
      expect(await manager.undo()).toBeUndefined();
    });
  });
});
