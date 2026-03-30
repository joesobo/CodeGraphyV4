import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderCommandMethods } from '../../../../src/extension/graphView/provider/commands';

describe('graphView/provider/commands', () => {
  it('sends graph commands and export requests through the provider message bridge', () => {
    const sendMessage = vi.fn();
    const emit = vi.fn();
    const methods = createGraphViewProviderCommandMethods(
      {
        _eventBus: { emit },
        _sendMessage: sendMessage,
      },
      {
        getUndoManager: () => ({
          undo: vi.fn(async () => undefined),
          redo: vi.fn(async () => undefined),
          canUndo: vi.fn(() => false),
          canRedo: vi.fn(() => false),
        }),
      },
    );

    methods.sendCommand('FIT_VIEW');
    methods.emitEvent('analysis:completed', { graph: { nodes: [], edges: [] }, duration: 1 });
    methods.requestExportPng();
    methods.requestExportSvg();
    methods.requestExportJpeg();
    methods.requestExportJson();
    methods.requestExportMarkdown();

    expect(sendMessage.mock.calls).toEqual([
      [{ type: 'FIT_VIEW' }],
      [{ type: 'REQUEST_EXPORT_PNG' }],
      [{ type: 'REQUEST_EXPORT_SVG' }],
      [{ type: 'REQUEST_EXPORT_JPEG' }],
      [{ type: 'REQUEST_EXPORT_JSON' }],
      [{ type: 'REQUEST_EXPORT_MD' }],
    ]);
    expect(emit).toHaveBeenCalledWith('analysis:completed', {
      graph: { nodes: [], edges: [] },
      duration: 1,
    });
  });

  it('delegates undo and redo operations to the undo manager', async () => {
    const undo = vi.fn(async () => 'Undo delete');
    const redo = vi.fn(async () => 'Redo delete');
    const methods = createGraphViewProviderCommandMethods(
      { _eventBus: { emit: vi.fn() }, _sendMessage: vi.fn() },
      {
        getUndoManager: () => ({
          undo,
          redo,
          canUndo: vi.fn(() => true),
          canRedo: vi.fn(() => true),
        }),
      },
    );

    await expect(methods.undo()).resolves.toBe('Undo delete');
    await expect(methods.redo()).resolves.toBe('Redo delete');

    expect(undo).toHaveBeenCalledOnce();
    expect(redo).toHaveBeenCalledOnce();
  });

  it('delegates undo availability checks to the undo manager', () => {
    const canUndo = vi.fn(() => true);
    const canRedo = vi.fn(() => false);
    const methods = createGraphViewProviderCommandMethods(
      { _eventBus: { emit: vi.fn() }, _sendMessage: vi.fn() },
      {
        getUndoManager: () => ({
          undo: vi.fn(async () => undefined),
          redo: vi.fn(async () => undefined),
          canUndo,
          canRedo,
        }),
      },
    );

    expect(methods.canUndo()).toBe(true);
    expect(methods.canRedo()).toBe(false);
    expect(canUndo).toHaveBeenCalledOnce();
    expect(canRedo).toHaveBeenCalledOnce();
  });
});
