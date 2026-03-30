import * as ts from 'typescript';

export type HelperContainer = ts.Block | ts.SourceFile;

export function findHelperContainer(node: ts.Node | undefined): HelperContainer | undefined {
  for (let current = node; current; current = current.parent) {
    if (ts.isBlock(current) || ts.isSourceFile(current)) {
      return current;
    }
  }

  return undefined;
}

export function ancestorHelperContainers(node: ts.Node): HelperContainer[] {
  const containers: HelperContainer[] = [];

  for (let current = findHelperContainer(node.parent); current; current = findHelperContainer(current.parent)) {
    containers.push(current);
  }

  return containers;
}
