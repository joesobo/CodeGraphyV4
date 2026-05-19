/**
 * @fileoverview Plugin-owned data persistence contracts.
 * @module @codegraphy/plugin-api/data
 */

export interface IPluginDataSaveOptions {
  undoLabel?: string;
}

export interface IPluginDataHost {
  loadData<T>(fallback: T): T;
  saveData<T>(data: T, options?: IPluginDataSaveOptions): Promise<void>;
}
