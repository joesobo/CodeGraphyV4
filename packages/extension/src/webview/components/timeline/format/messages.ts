const DEFAULT_MESSAGE_MAX_LENGTH = 50;
const ELLIPSIS_LENGTH = 3;

export function getMessageTitle(message: string): string {
  return message.split(/\r?\n/, 1)[0] ?? '';
}

export function getMessageBody(message: string): string {
  return message
    .split(/\r?\n/)
    .slice(1)
    .join('\n')
    .trim();
}

export function truncateMessage(
  message: string,
  maxLength: number = DEFAULT_MESSAGE_MAX_LENGTH,
): string {
  if (message.length <= maxLength) {
    return message;
  }

  return `${message.slice(0, maxLength - ELLIPSIS_LENGTH)}...`;
}
