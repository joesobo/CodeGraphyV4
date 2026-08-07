export function isMarkdownPath(path: string): boolean {
  return /\.(?:md|markdown|mdx)$/iu.test(path);
}
