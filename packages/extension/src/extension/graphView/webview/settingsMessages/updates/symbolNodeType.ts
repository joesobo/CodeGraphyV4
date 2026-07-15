export function isSymbolDependentNodeType(nodeType: string): boolean {
  return nodeType === 'variable'
    || nodeType.startsWith('symbol:')
    || (nodeType.startsWith('plugin:') && nodeType.includes(':symbol:'));
}
