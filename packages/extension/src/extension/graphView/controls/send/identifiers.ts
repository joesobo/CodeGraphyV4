export function prettifyIdentifier(value: string): string {
  return value
    .replace(/^codegraphy:/, '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
