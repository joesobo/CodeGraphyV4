export type GraphCursorStyle = 'default' | 'pointer';

export function isMacControlContextClick(event: MouseEvent, isMacPlatform: boolean): boolean {
  return isMacPlatform && event.button === 0 && event.ctrlKey && !event.metaKey;
}

function applyCursorToNodes(nodes: NodeListOf<Node> | NodeList, cursor: GraphCursorStyle): void {
  for (const node of Array.from(nodes)) {
    if (node instanceof HTMLElement) {
      node.style.cursor = cursor;
    }
  }
}

export function applyCursorToGraphSurface(container: HTMLDivElement, cursor: GraphCursorStyle): void {
  container.style.cursor = cursor;
  applyCursorToNodes(container.childNodes, cursor);
  applyCursorToNodes(container.querySelectorAll('canvas'), cursor);
}
