export interface PluginRuntimeFailureMessage {
  type: 'PLUGIN_RUNTIME_FAILED';
  payload: {
    pluginId: string;
    hook: string;
    message: string;
  };
}

export function createPluginRuntimeFailureReporter(
  pluginId: string,
  removePlugin: () => void,
  postHostMessage: (message: unknown) => void,
): (hook: string, error: unknown) => void {
  let reported = false;

  return (hook, error) => {
    if (reported) return;
    reported = true;
    const message = error instanceof Error ? error.message : String(error);
    removePlugin();
    postHostMessage({
      type: 'PLUGIN_RUNTIME_FAILED',
      payload: { pluginId, hook, message },
    } satisfies PluginRuntimeFailureMessage);
    postHostMessage({
      type: 'TOGGLE_PLUGIN',
      payload: { pluginId, enabled: false },
    });
  };
}
