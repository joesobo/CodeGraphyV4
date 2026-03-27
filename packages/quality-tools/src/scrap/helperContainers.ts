import * as ts from 'typescript';

export type HelperContainer = ts.Block | ts.SourceFile;

export function findHelperContainer(node: ts.Node | undefined): HelperContainer | undefined {
  let current = node;

  while (current && !ts.isBlock(current) && !ts.isSourceFile(current)) {
    current = current.parent;
  }

  return current as HelperContainer | undefined;
}

export function ancestorHelperContainers(node: ts.Node): HelperContainer[] {
  const containers: HelperContainer[] = [];
  let current = findHelperContainer(node.parent);

  while (current) {
    containers.push(current);
    current = findHelperContainer(current.parent);
  }

  return containers;
}
