export function logLifecycleError(hook: string, pluginId: string, error: unknown): void {
  console.error(`[CodeGraphy] Error in ${hook} for ${pluginId}:`, error);
}
