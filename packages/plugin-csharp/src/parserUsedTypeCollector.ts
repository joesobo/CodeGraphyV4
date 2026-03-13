type TypeFilter = (typeName: string) => boolean;

export function collectTypesFromPattern(
  content: string,
  pattern: RegExp,
  typeSet: Set<string>,
  shouldInclude: TypeFilter = () => true,
): void {
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(content)) !== null) {
    const typeName = match[1];
    if (shouldInclude(typeName)) {
      typeSet.add(typeName);
    }
  }
}
