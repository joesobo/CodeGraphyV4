export interface GraphViewPluginExporterPayload {
  pluginId: string;
  index: number;
}

export interface GraphViewPluginExporterHandlers {
  getPluginApi(pluginId: string):
    | { exporters: ReadonlyArray<{ run(): Promise<void> | void }> }
    | undefined;
  logError(message: string, error: unknown): void;
}

export async function applyPluginExporterAction(
  payload: GraphViewPluginExporterPayload,
  handlers: GraphViewPluginExporterHandlers,
): Promise<void> {
  const api = handlers.getPluginApi(payload.pluginId);
  const exporter = api?.exporters[payload.index];
  if (!exporter) {
    return;
  }

  try {
    await exporter.run();
  } catch (error) {
    handlers.logError('[CodeGraphy] Plugin export action error:', error);
  }
}
