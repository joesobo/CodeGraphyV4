import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';

type AccessibilityEvent =
  | MouseEvent
  | ReactMouseEvent<HTMLElement>
  | ReactKeyboardEvent<HTMLElement>;

export function toNativeMouseEvent(
  type: 'click' | 'contextmenu',
  event: AccessibilityEvent,
): MouseEvent {
  const nativeEvent = getNativeMouseEvent(event);
  if (nativeEvent) {
    return nativeEvent;
  }

  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: mouseButtonForEventType(type),
    buttons: mouseButtonForEventType(type),
    clientX: getMouseEventCoordinate(event, 'clientX'),
    clientY: getMouseEventCoordinate(event, 'clientY'),
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  });
}

export function handleAccessibilityNodeKeyDown(
  nodeId: string,
  handleNodeClick: (nodeId: string, event: AccessibilityEvent) => void,
  event: ReactKeyboardEvent<HTMLElement>,
): void {
  if (!isKeyboardActivation(event.key)) {
    return;
  }

  event.preventDefault();
  handleNodeClick(nodeId, event);
}

function getNativeMouseEvent(event: AccessibilityEvent): MouseEvent | undefined {
  if (event instanceof MouseEvent) {
    return event;
  }

  return event.nativeEvent instanceof MouseEvent ? event.nativeEvent : undefined;
}

function mouseButtonForEventType(type: 'click' | 'contextmenu'): number {
  return type === 'contextmenu' ? 2 : 0;
}

function getMouseEventCoordinate(
  event: AccessibilityEvent,
  key: 'clientX' | 'clientY',
): number {
  if (!(key in event)) {
    return 0;
  }

  return (event as MouseEvent | ReactMouseEvent<HTMLElement>)[key];
}

function isKeyboardActivation(key: string): boolean {
  return key === 'Enter' || key === ' ';
}
