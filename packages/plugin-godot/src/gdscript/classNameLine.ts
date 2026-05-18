export function isLeadingClassNameStatement(content: string, offset: number): boolean {
  const beforeOffset = content.slice(0, offset);
  const lineStart = beforeOffset.lastIndexOf('\n') + 1;
  return content.slice(lineStart, offset).trim() === '' && content.startsWith('class_name', offset);
}
