export function existingItemNameMessage(name: string): string {
  return `A file or folder **${name}** already exists at this location. Please choose a different name.`;
}

export const missingItemNameMessage = 'A file or folder name must be provided.';
export const leadingSlashItemNameMessage = 'A file or folder name cannot start with a slash.';
export const whitespaceItemNameMessage = 'Leading or trailing whitespace detected in file or folder name.';

export function invalidItemNameMessage(name: string): string {
  return `The name **${name}** is not valid as a file or folder name. Please choose a different name.`;
}

export function isExistingItemError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    if (String(error.code) === 'FileExists') return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /already exists|file exists/i.test(message);
}
