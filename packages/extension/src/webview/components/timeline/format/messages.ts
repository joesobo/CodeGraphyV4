const DEFAULT_MESSAGE_MAX_LENGTH = 50;
const ELLIPSIS_LENGTH = 3;

export function truncateMessage(
  message: string,
  maxLength: number = DEFAULT_MESSAGE_MAX_LENGTH,
): string {
  if (message.length <= maxLength) {
    return message;
  }

  return `${message.slice(0, maxLength - ELLIPSIS_LENGTH)}...`;
}
