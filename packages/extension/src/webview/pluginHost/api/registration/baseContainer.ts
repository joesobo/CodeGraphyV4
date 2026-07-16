export function getOrCreateContainer(
  pluginId: string,
  containers: Map<string, HTMLDivElement>,
): HTMLDivElement {
  let container = containers.get(pluginId);
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('data-cg-plugin', pluginId);
    container.style.display = 'none';
    document.body.appendChild(container);
    containers.set(pluginId, container);
  }
  return container;
}
