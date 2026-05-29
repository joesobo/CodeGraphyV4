export type TypeScriptPathMapping = {
  baseUrl: string;
  key: string;
  targets: string[];
};

export function comparePathMappingSpecificity(
  left: TypeScriptPathMapping,
  right: TypeScriptPathMapping,
): number {
  const [leftPrefixLength, leftSuffixLength] = pathMappingSpecificity(left);
  const [rightPrefixLength, rightSuffixLength] = pathMappingSpecificity(right);
  return rightPrefixLength - leftPrefixLength || rightSuffixLength - leftSuffixLength;
}

function pathMappingSpecificity(mapping: TypeScriptPathMapping): [number, number] {
  const [prefix, suffix] = mapping.key.split('*');
  return suffix === undefined
    ? [Number.POSITIVE_INFINITY, mapping.key.length]
    : [prefix.length, suffix.length];
}
