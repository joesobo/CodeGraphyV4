import { getUndoManager } from '../../undoManager';
import type { EventName, EventPayloads } from '../../../core/plugins/eventBus';

interface GraphViewProviderCommandMessage {
  type:
    | 'FIT_VIEW'
    | 'ZOOM_IN'
    | 'ZOOM_OUT'
    | 'CYCLE_VIEW'
    | 'CYCLE_LAYOUT'
    | 'TOGGLE_DIMENSION'
    | 'REQUEST_EXPORT_PNG'
    | 'REQUEST_EXPORT_SVG'
    | 'REQUEST_EXPORT_JPEG'
    | 'REQUEST_EXPORT_JSON'
    | 'REQUEST_EXPORT_MD';
}

export interface GraphViewProviderCommandMethodsSource {
  _eventBus: {
    emit<E extends EventName>(event: E, payload: EventPayloads[E]): void;
  };
  _sendMessage(message: GraphViewProviderCommandMessage): void;
}

export interface GraphViewProviderCommandMethods {
  sendCommand(
    command:
      | 'FIT_VIEW'
      | 'ZOOM_IN'
      | 'ZOOM_OUT'
      | 'CYCLE_VIEW'
      | 'CYCLE_LAYOUT'
      | 'TOGGLE_DIMENSION',
  ): void;
  emitEvent<E extends EventName>(event: E, payload: EventPayloads[E]): void;
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  canUndo(): boolean;
  canRedo(): boolean;
  requestExportPng(): void;
  requestExportSvg(): void;
  requestExportJpeg(): void;
  requestExportJson(): void;
  requestExportMarkdown(): void;
}

interface GraphViewProviderUndoManagerLike {
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  canUndo(): boolean;
  canRedo(): boolean;
}

export interface GraphViewProviderCommandMethodDependencies {
  getUndoManager(): GraphViewProviderUndoManagerLike;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderCommandMethodDependencies = {
  getUndoManager,
};

export function createGraphViewProviderCommandMethods(
  source: GraphViewProviderCommandMethodsSource,
  dependencies: GraphViewProviderCommandMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderCommandMethods {
  return {
    sendCommand: command => {
      source._sendMessage({ type: command });
    },
    emitEvent: (event, payload) => {
      source._eventBus.emit(event, payload);
    },
    undo: () => dependencies.getUndoManager().undo(),
    redo: () => dependencies.getUndoManager().redo(),
    canUndo: () => dependencies.getUndoManager().canUndo(),
    canRedo: () => dependencies.getUndoManager().canRedo(),
    requestExportPng: () => {
      source._sendMessage({ type: 'REQUEST_EXPORT_PNG' });
    },
    requestExportSvg: () => {
      source._sendMessage({ type: 'REQUEST_EXPORT_SVG' });
    },
    requestExportJpeg: () => {
      source._sendMessage({ type: 'REQUEST_EXPORT_JPEG' });
    },
    requestExportJson: () => {
      source._sendMessage({ type: 'REQUEST_EXPORT_JSON' });
    },
    requestExportMarkdown: () => {
      source._sendMessage({ type: 'REQUEST_EXPORT_MD' });
    },
  };
}
