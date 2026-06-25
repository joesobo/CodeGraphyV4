export function humanizeEventName(event: string): string {
  return event
    .split('-')
    .filter(Boolean)
    .map((part, index) => index === 0
      ? `${part.charAt(0).toUpperCase()}${part.slice(1)}`
      : part)
    .join(' ');
}
