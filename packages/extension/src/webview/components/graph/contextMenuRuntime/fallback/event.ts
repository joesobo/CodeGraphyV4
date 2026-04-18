export function createFallbackContextMenuEvent(
  clientX: number,
  clientY: number,
  ctrlKey: boolean,
): MouseEvent {
  return new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    buttons: 2,
    clientX,
    clientY,
    ctrlKey,
  });
}
