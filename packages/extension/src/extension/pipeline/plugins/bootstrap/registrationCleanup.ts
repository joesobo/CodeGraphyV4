export interface RejectedPluginRuntime {
  id: string;
  onUnload?(): void;
}

export function disposeRejectedPluginRuntime(
  plugin: RejectedPluginRuntime,
  warn: (message: string) => void,
): void {
  try {
    plugin.onUnload?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warn(
      `CodeGraphy plugin '${plugin.id}' could not be unloaded after registration failed: ${message}`,
    );
  }
}
