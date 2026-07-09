import { posix } from 'node:path';

const filesPerDirectory = 5;

function requireNonnegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative integer`);
  }
}

export function fixtureSourcePath(fileIndex: number): string {
  requireNonnegativeInteger(fileIndex, 'fileIndex');
  const groupIndex = Math.floor(fileIndex / filesPerDirectory);
  return posix.join(
    'src',
    `group-${groupIndex.toString().padStart(5, '0')}`,
    `file-${fileIndex.toString().padStart(6, '0')}.ts`,
  );
}

export function fixtureImportSpecifier(fromIndex: number, toIndex: number): string {
  const relativePath = posix.relative(
    posix.dirname(fixtureSourcePath(fromIndex)),
    fixtureSourcePath(toIndex).replace(/\.ts$/, ''),
  );
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

export function fixtureBatchSourcePaths(
  fileCount: number,
  batchSize: number,
): string[] {
  requireNonnegativeInteger(fileCount, 'fileCount');
  requireNonnegativeInteger(batchSize, 'batchSize');
  if (batchSize > fileCount) {
    throw new Error('batchSize cannot exceed fileCount');
  }
  return Array.from(
    { length: batchSize },
    (_, offset) => fixtureSourcePath(fileCount - batchSize + offset),
  );
}
